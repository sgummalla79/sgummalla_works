// What the browser may know about a stored Salesforce token. The access and
// refresh tokens themselves never leave the server.
export interface PublicSfToken {
  sf_username: string;
  instance_url: string;
  issued_at: string;
  has_refresh_token: boolean;
  from_cache: boolean;
}

// A stored token row as the database driver returns it; only the fields listed
// in PublicSfToken are ever read from it.
type StoredSfToken = Record<string, unknown>;

export function toPublicSfToken(
  sfUsername: string,
  row: StoredSfToken,
  fromCache: boolean,
): PublicSfToken {
  return {
    sf_username: sfUsername,
    instance_url: row.instance_url as string,
    issued_at: row.issued_at as string,
    has_refresh_token: Boolean(row.refresh_token),
    from_cache: fromCache,
  };
}
