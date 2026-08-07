import data from './data/generatedProblemData.js'
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import userScores from '../../../entities/userScores.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


let stats = {
  difficulty: {},
  hasExampleTestcaseList: 0,
  noExampleTestcaseList: 0,
  hasTitle: 0,
  noTitle: 0,
  hassimilarQuestionList: 0,
  nosimilarQuestionList: 0,
  hastopicTags: 0,
  notopicTags: 0,
  topics: {},
  total: 0,
  easyQs: [],
  mediumQs: [],
  hardQs: []
}

let a = new userScores()

console.log(a)
// for (let d of data) {
//   stats.total++
//   for (let i = 0; i < d.primary_topics.length; i++) {
//     d.primary_topics[i] = d.primary_topics[i].replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
//   }
//   for (let i = 0; i < d.secondary_topics.length; i++) {
//     d.secondary_topics[i] = d.secondary_topics[i].replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
//   }
// }
//
// saveFile(data, 'modifiedFinalData.json')

async function saveFile(content, fileName) {
  try {
    const filePath = path.join(__dirname, 'data', fileName);

    const toJson = JSON.stringify(content, null, 2)
    await writeFile(filePath, toJson, 'utf8');
  } catch (err) {

    console.error('Error writing file:', err);
  }
}



