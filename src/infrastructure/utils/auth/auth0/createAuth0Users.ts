import { ManagementClient } from "auth0";
import keys from "../../../../config/app.js"


const management = new ManagementClient({
  domain: keys.load_test_parameters.domain,
  clientId: keys.load_test_parameters.clientId,
  clientSecret: keys.load_test_parameters.clientSecret,
});


for (let i = 1; i <= 50; i++) {
  const email = `test${i}@a.com`;

  try {
    // resp = await management.users.delete(users[i] as string)
    await management.users.create({
      connection: "Username-Password-Authentication",
      username: `test${i}`,
      email,
      password: keys.load_test_parameters.test_users_passwords,
      email_verified: false,
    });


  }
  catch (e) {
    console.log("Unable to create user", e)
  }
}
