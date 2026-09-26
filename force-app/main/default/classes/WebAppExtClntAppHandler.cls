public class WebAppExtClntAppHandler extends Auth.ExternalClientAppOauthHandler {

    public Auth.TokenValidationResult validateIncomingToken(
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

        String sub;
        try {
            Auth.JWT jwt = Auth.JWTUtil.validateJWTWithCert(incomingToken, 'sgummalla_net_cert');
            sub = jwt.getSub();
        } catch (Exception e) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType,
                'JWT validation failed: ' + e.getMessage()
            );
        }

        if (String.isBlank(sub)) {
            return new Auth.TokenValidationResult(
                false, null, null, incomingToken, tokenType, 'Missing sub claim'
            );
        }

        Auth.UserData userData = new Auth.UserData(
            null, null, null, null,
            sub, null, sub, null, 'WebApp', null, null
        );

        return new Auth.TokenValidationResult(
            true, null, userData, incomingToken, tokenType, null
        );
    }

    public User getUserForTokenSubject(
        Id networkId,
        Auth.TokenValidationResult result,
        Boolean canCreateUser,
        String appDeveloperName,
        Auth.IntegratingAppType appType
    ) {
        String email = result.userData.email;
        List<User> users = [
            SELECT Id FROM User
            WHERE Email = :email AND IsActive = true
            LIMIT 1
        ];
        return users.isEmpty() ? null : users[0];
    }
}