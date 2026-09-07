
import api from './infrastructure/api/express/index.js'
import mcp from './infrastructure/mcp/index.js'
import config from './config/app.js'


if (config.load_test_parameters.load_testing) {
  console.log("Load Testing Mode")
}
api.listen(3001, () => {
  console.log(`API listening on port 3001`)
})

if (!config.load_test_parameters.load_testing) {
  mcp.listen(3000, () => {
    console.log(`MCP listening on port 3000`)
  })
}


