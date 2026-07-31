import unirest from 'unirest';

import rankings from './rankings-data.json' with { type: 'json' };
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Recreate __dirname functionality for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let fetchReq = async (title, rank) => {
  try {
    var res = await unirest('POST', 'https://leetcode.com/graphql/')
      .headers({
        'Content-Type': 'application/json',
        'Cookie': 'INGRESSCOOKIE=46df26dea565a5e49e40e9972111f416|8e0876c7c1464cc0ac96bc2edceabd27; _cfuvid=d2qGfQJzi8AnMTqiwmhV81NUDAENdCcF8T3mkyVlSDA-1785254922.6302679-1.0.1.1-cv9jwYJtN7icSG1E49KahKBIMwMWT8w5uO9yGtvd3lo; csrftoken=dgLYePwIvEIUKoG2ZCe5ycJBUeBdl3wm'
      })
      .send(JSON.stringify({
        query: `query questionContent($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    title
    content
    mysqlSchemas
    hints
    difficulty
    categoryTitle
    similarQuestionList {
        titleSlug
    }
    topicTags {
      name
      slug
    }
    exampleTestcaseList
  }
}`,
        variables: { "titleSlug": `${title}` }
      }))
    let data = JSON.parse(res.raw_body);

    if (typeof data?.data != 'object') {
      throw new Error("Failed to get data from " + title)
    }

    console.log("Got: " + title)

    data.data['rating'] = rank
    data.data['slug'] = title
    return data.data
  }
  catch (e) {
    console.error("Failed to fetch " + title)
    throw new Error("Failed to fetch " + title, "\n" + e);
  }

}


async function saveFile(content, fileName) {
  try {
    const filePath = path.join(__dirname, 'data', fileName);

    const toJson = JSON.stringify(content, null, 2)
    await writeFile(filePath, toJson, 'utf8');
  } catch (err) {

    console.error('Error writing file:', err);
  }
}



let completeQuestionBank = []
let errors = []

let runner = async () => {
  for (let i = 0; i < rankings.length; i++) {
    try {
      completeQuestionBank.push(await fetchReq(rankings[i].TitleSlug, rankings[i].Rating))
    }
    catch (e) {
      errors.push(rankings[i].TitleSlug)
    }

  }
}

await runner()
await saveFile(completeQuestionBank, 'data1.json')
await saveFile({ errors }, 'error1.json')



