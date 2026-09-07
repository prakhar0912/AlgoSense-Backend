import keys from "../../../../config/app.js"
import path from "node:path";
import fs from "fs"

const getFreshToken = async (userName: string, email: string, password: string) => {
  const response = await fetch(`https://${keys.load_test_parameters.domain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: email,
      password: password,
      client_id: keys.load_test_parameters.clientId,
      client_secret: keys.load_test_parameters.clientSecret,
      audience: keys.auth0.audience,
      realm: "Username-Password-Authentication",
      scope: "openid profile email permission",
    }),
  });

  const tokens = await response.json();
  return tokens.access_token
}

const users: Record<string, string> = {};

for (let i = 1; i <= 50; i++) {

  try {
    let userToken = await getFreshToken(`test${i}`, `test${i}@a.com`, keys.load_test_parameters.test_users_passwords)
    users[`test${i}`] = userToken
  }
  catch (e) {
    console.log("Unable to get toke", e)
    continue
  }
}

const filePath = path.join(import.meta.dirname, 'tokens.json');
fs.writeFileSync(filePath, JSON.stringify(users), 'utf-8');

