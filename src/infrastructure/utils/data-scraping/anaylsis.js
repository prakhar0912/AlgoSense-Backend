import data from './data/data1.json' with { type: 'json' };
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';


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


for (let d of data) {
  stats.total++
  if (typeof d.question.title == 'string' && d.question.title.trim().length > 0) {
    stats.hasTitle++
  }
  else {
    stats.noTitle++
  }


  if (!Object.hasOwn(stats.difficulty, d.question.difficulty)) {
    stats.difficulty[`${d.question.difficulty}`] = 0
  }

  stats.difficulty[`${d.question.difficulty}`]++
  // d.question.rating = d.rating
  // d.question.slug = d.slug
  // if (d.question.difficulty === "Easy" && stats.easyQs.length < 100) {
  //   stats.easyQs.push(d.question)
  // }
  // if (d.question.difficulty === "Medium" && stats.mediumQs.length < 100) {
  //   stats.mediumQs.push(d.question)
  // }
  // if (d.question.difficulty === "Hard" && stats.hardQs.length < 100) {
  //   stats.hardQs.push(d.question)
  // }
  //




  if (d.question.exampleTestcaseList.length > 0) {
    stats.hasExampleTestcaseList++
  }
  else {
    stats.noExampleTestcaseList++
  }

  if (d.question.similarQuestionList.length > 0) {
    stats.hassimilarQuestionList++
  }
  else {
    stats.nosimilarQuestionList++
  }

  if (d.question.topicTags.length > 0) {
    stats.hastopicTags++
  }
  else {
    stats.notopicTags++
  }

  for (const el of d.question.topicTags) {
    if (!Object.hasOwn(stats.topics, el.slug)) {
      stats.topics[`${el.slug}`] = 0
    }

    stats.topics[`${el.slug}`]++

  }


}

console.log(stats)
// saveFile([...stats.easyQs, ...stats.mediumQs, ...stats.hardQs], '100sData.json')

async function saveFile(content, fileName) {
  try {
    const filePath = path.join(__dirname, 'data', fileName);

    const toJson = JSON.stringify(content, null, 2)
    await writeFile(filePath, toJson, 'utf8');
  } catch (err) {

    console.error('Error writing file:', err);
  }
}



