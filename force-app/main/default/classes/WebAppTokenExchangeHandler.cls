public class WebAppTokenExchangeHandler extends Auth.Oauth2TokenExchangeHandler {

    // Auth0 tenant domain, e.g. 'my-tenant.auth0.com' (the AUTH0_DOMAIN of the
    // web app). Apex cannot read env config, so it lives here as a named constant.
    // Salesforce fetches the signing keys from this tenant's JWKS endpoint, so key
    // rotation needs no change here. Requires a Remote Site Setting for
    // https://<AUTH0_DOMAIN>.
    private static final String AUTH0_DOMAIN = 'dev-r4412run2i8kg030.us.auth0.com';
    private static final String AUTH0_DOMAIN_PLACEHOLDER = 'REPLACE_WITH_TENANT.auth0.com';
    // Client ID of the Auth0 application that issues the id_token we accept. Tokens
    // issued to any other application in the tenant are rejected (audience check).
    private static final String AUTH0_CLIENT_ID = 'vtImy2fRiNOXszjLdks7KqiH4TC8Kfuc';
    private static final String JWKS_PATH = '/.well-known/jwks.json';
    private static final String ISSUER_SCHEME = 'https://';

    public override Auth.TokenValidationResult validateIncomingToken(
        String appDeveloperName,
        Auth.IntegratingAppType appType,
        String incomingToken,
        Auth.OAuth2TokenExchangeType tokenType
    ) {
        if (tokenType != Auth.OAuth2TokenExchangeType.JWT) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType, 'Expected a JWT token'
            );
        }

        // Fail closed until the tenant domain has been configured.
        if (AUTH0_DOMAIN == AUTH0_DOMAIN_PLACEHOLDER) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'AUTH0_DOMAIN is not configured in WebAppTokenExchangeHandler'
            );
        }

        // Step 7 of the token-exchange flow: verify the JWT signature against the
        // Auth0 tenant's published keys BEFORE trusting any claim. Without this
        // anyone could forge a token naming an arbitrary sf_username.
        Auth.JWT jwt;
        try {
            jwt = Auth.JWTUtil.validateJWTWithKeysEndpoint(
                incomingToken, ISSUER_SCHEME + AUTH0_DOMAIN + JWKS_PATH, true
            );
        } catch (Exception e) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'JWT signature validation failed: ' + e.getMessage()
            );
        }

        // Returns every claim except aud/iss/sub (use jwt.getIss() for those)
        Map<String, Object> claims = jwt.getAdditionalClaims();

        // Reject expired tokens
        if (isExpired(claims.get('exp'))) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType, 'Token expired or missing exp'
            );
        }

        // Must be exactly our tenant (the signature alone would also accept tokens
        // from any tenant whose keys we happened to trust).
        String iss = jwt.getIss();
        if (iss != ISSUER_SCHEME + AUTH0_DOMAIN + '/') {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'Untrusted issuer: ' + iss
            );
        }

        // The token must have been issued to our web app, not another Auth0 app.
        if (!isIssuedToThisApp(jwt.getAud())) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'Token audience is not this application'
            );
        }

        // Nested JSON lists come back from getAdditionalClaims() as a string
        Object rawAccounts = claims.get('sf_accounts');
        List<Object> sfAccounts;
        try {
            sfAccounts = rawAccounts instanceof String
                ? (List<Object>) JSON.deserializeUntyped((String) rawAccounts)
                : (List<Object>) rawAccounts;
        } catch (Exception e) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'Malformed sf_accounts claim: ' + e.getMessage()
            );
        }
        // Find the sf_accounts entry matching this External Client App
        if (sfAccounts == null || sfAccounts.isEmpty()) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'No sf_accounts claim found in token'
            );
        }

        String sfUsername;
        for (Object item : sfAccounts) {
            Map<String, Object> acct = (Map<String, Object>) item;
            if (appDeveloperName.equals(acct.get('appDeveloperName'))) {
                sfUsername = (String) acct.get('sf_username');
                break;
            }
        }

        if (String.isBlank(sfUsername)) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'No sf_accounts entry found for app: ' + appDeveloperName
            );
        }

        Auth.UserData userData = new Auth.UserData(
            sfUsername, null, null, null,
            (String) claims.get('email'),
            null,
            sfUsername,  // username = sf_username for direct lookup
            null, iss, null, null
        );

        return new Auth.TokenValidationResult(
            true, null, userData, incomingToken, tokenType, null
        );
    }

    public override User getUserForTokenSubject(
        Id networkId,
        Auth.TokenValidationResult result,
        Boolean canCreateUser,
        String appDeveloperName,
        Auth.IntegratingAppType appType
    ) {
        String sfUsername = result.userData.username;
        List<User> users = [
            SELECT Id FROM User
            WHERE Username = :sfUsername AND IsActive = true
            LIMIT 1
        ];
        return users.isEmpty() ? null : users[0];
    }

    // Salesforce returns aud as the plain client id, or as a bracketed list
    // ('[id]' or '[id1, id2]') when the token has several audiences. Requires an
    // exact match on one entry, never a substring.
    private static Boolean isIssuedToThisApp(String aud) {
        if (String.isBlank(aud)) {
            return false;
        }
        for (String entry : aud.replace('[', '').replace(']', '').replace('"', '').split(',')) {
            if (entry.trim() == AUTH0_CLIENT_ID) {
                return true;
            }
        }
        return false;
    }

    // Salesforce returns exp from getAdditionalClaims() as a UTC date-time string
    // ('yyyy-MM-dd HH:mm:ss'); accept epoch seconds too. Anything unparseable or
    // missing is treated as expired (fail closed).
    private static Boolean isExpired(Object exp) {
        if (exp == null) {
            return true;
        }
        try {
            String raw = String.valueOf(exp);
            Datetime expiry = raw.contains('-')
                ? Datetime.valueOfGmt(raw)
                : Datetime.newInstance(Long.valueOf(raw.substringBefore('.')) * 1000);
            return expiry.getTime() < Datetime.now().getTime();
        } catch (Exception e) {
            return true;
        }
    }
}
