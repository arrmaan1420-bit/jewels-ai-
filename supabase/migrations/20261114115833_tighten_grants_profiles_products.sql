/*
# Tighten table grants for profiles and products

Plain-English summary:
Supabase grants every table to the anonymous role by default. The app
requires sign-in, so anonymous visitors should not have any access at all.
This also removes delete rights on profiles, which users never need.

1. Modified Tables
- `profiles`: revoke all rights from anon; remove DELETE from authenticated.
- `products`: revoke all rights from anon.

2. Security
- Only signed-in users can reach these tables, and only for the actions
  their row policies allow.

3. Important Notes
- 3.1 No data is changed or removed by this migration.
*/

REVOKE ALL ON profiles FROM anon;
REVOKE DELETE ON profiles FROM authenticated;
REVOKE ALL ON products FROM anon;
