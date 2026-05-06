import sql from "./db.js";

async function tableExists(name: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `;
  return !!row;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  return !!row;
}

export async function ensureTables(): Promise<void> {
  if (!(await tableExists("sf_clients"))) {
    await sql`
      CREATE TABLE sf_clients (
        id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        label       text        NOT NULL,
        client_id   text        NOT NULL,
        login_url   text        NOT NULL DEFAULT 'https://login.salesforce.com',
        private_key text        NOT NULL,
        flow_type   text        NOT NULL DEFAULT 'jwt_bearer',
        created_at  timestamptz NOT NULL DEFAULT now()
      )
    `;
  } else if (!(await columnExists("sf_clients", "flow_type"))) {
    await sql`
      ALTER TABLE sf_clients ADD COLUMN flow_type text NOT NULL DEFAULT 'jwt_bearer'
    `;
  }

  if (!(await columnExists("sf_clients", "user_id"))) {
    await sql`
      ALTER TABLE sf_clients ADD COLUMN user_id text NOT NULL DEFAULT ''
    `;
  }

  // Backfill existing rows that have no user_id with the owner's Auth0 user ID
  const ownerId = process.env.OWNER_USER_ID;
  if (ownerId) {
    await sql`
      UPDATE sf_clients SET user_id = ${ownerId} WHERE user_id = ''
    `;
  }

  if (!(await tableExists("user_id_tokens"))) {
    await sql`
      CREATE TABLE user_id_tokens (
        user_id    text        PRIMARY KEY,
        id_token   text        NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  }

  if (!(await tableExists("sf_tokens"))) {
    await sql`
      CREATE TABLE sf_tokens (
        id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        client_db_id  uuid        NOT NULL REFERENCES sf_clients(id) ON DELETE CASCADE,
        sf_username   text        NOT NULL,
        access_token  text        NOT NULL,
        refresh_token text,
        instance_url  text        NOT NULL,
        issued_at     timestamptz NOT NULL DEFAULT now(),
        UNIQUE(client_db_id, sf_username)
      )
    `;
  }

  if (!(await tableExists("user_profiles"))) {
    await sql`
      CREATE TABLE user_profiles (
        user_id      text        PRIMARY KEY,
        accent_color text,
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
  }
}
