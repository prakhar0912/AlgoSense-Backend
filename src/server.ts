
import api from './infrastructure/api/express/index.js'
import mcp from './infrastructure/mcp/index.js'
import config from './config/app.js'



mcp.listen(3000, () => {
  console.log(`MCP listening on port 3000`)
})

// api.listen(Number(config.port) || 3000, () => {
//   console.log(`API listening on port
//     ${config.port || 3000}`)
// })
