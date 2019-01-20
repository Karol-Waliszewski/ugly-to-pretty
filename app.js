const fs = require("fs");
const readline = require("readline");
const path = require("path");
const PDF = require("html-pdf");
const Buffer = require("buffer").Buffer;
const Iconv = require("iconv").Iconv;

var getQuestions = function(callback) {
  // Getting all files in directory
  let files = fs.readdirSync(path.join(__dirname, "./src/questions"));
  // Iteration
  let k = 0;
  // Questions array
  let questions = [];

  // Getting only TXT files
  files = files.filter(file => file.endsWith(".txt"));

  // Iterate over files
  files.forEach(file => {
    //console.log(fs.readFileSync(path.join(__dirname, `./src/questions/${file}`),'utf8').split('\r'));

    let rd = readline.createInterface({
      input: fs.createReadStream(
        path.join(__dirname, `./src/questions/${file}`), { encoding: "binary" }
      ),
      output: false,
      console: false
    });

    let i = 0;
    let correct = [];

    let questionObject = {
      question: "",
      answers: []
    };

    rd.on("line", line => {

      var buf = new Buffer(line, "binary");
      var translated = new Iconv("CP1250", "UTF8").convert(buf).toString();
      line = translated;

      if (i == 0) {
        for (let j = 1; j < line.length; j++) {
          let ans = line[j] == "0" ? false : true;
          correct.push(ans);
        }
      } else if (i == 1) {
        let q = line;
        if (q.includes("[img]")) {
          q = q.slice(5, line.length - 6);
          q = `<img src="./images/${q}"/>`;
        }
        questionObject.question = q;
      } else {
        let ans = line.replace("/t", "").replace(/\s*$/, "");

        if (ans.includes("[img]")) {
          ans = ans
            .replace("[img]", "")
            .replace("[/img]", "")
            .replace(/\s*$/, "");
          ans = `<img src="./images/${ans}"/>`;
        }

        questionObject.answers.push({
          answer: ans,
          isCorrect: correct[i - 2]
        });
      }
      i++;
    });

    rd.on("close", () => {
      questions.push(questionObject);
      k++;

      if (k == files.length) {
        callback(questions);
      }
    });
  });
};

var renderHTML = function(questions) {
  let header = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.2/css/bulma.min.css">
    <link rel="stylesheet" href="./style.css">
    <title>Document</title>
</head>
<body>
    <section class="hero is-info is-medium is-bold">
        <div class="hero-body">
            <div class="container has-text-centered">
                <h1 class="title">Pytania i odpowiedzi. Milej nauki :)</h1>
                <h2 class="subtitle">Autor: <a href="https://github.com/Karol-Waliszewski">Karol Waliszewski</a></h2>
            </div>
        </div>
    </section>
    
    
    <div class="container">
     
        <section class="articles">
            <div class="column is-8 is-offset-2">
              
                <div class="card article">
                    <div class="card-content">`;
  let footer = `     
                    </div>
                </div>
        </section>
    </div>
</body>
</html>`;
  let body = ``;

  for (let question of questions) {
    let htmlQ = `<div class="media">
      <div class="media-content has-text-centered">
        <p class="title article-title is-4">${question.question}</p>
      </div>
     </div>
     <div class="content article-body">
      <ul>`;

    for (let answer of question.answers) {
      if (answer.isCorrect) {
        htmlQ += ` <li>
          <pre class="is-correct">${answer.answer}</pre>
          </li>`;
      } else {
        htmlQ += ` <li>
          <pre>${answer.answer}</pre>
          </li>`;
      }
    }
    htmlQ += `</ul></div>`;

    body += htmlQ;
  }

  return header + body + footer;
};

var deployHTML = function(html) {
  var dir = path.join(__dirname, "/dist");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, 0744);
  }

  // HTML
  fs.writeFile(path.join(dir, "./index.html"), html, "utf8", err => {
    if (err) console.log(err);
    else console.log("Saved HTML");
    
    // PDF
    // const options = {
    //   format: "Letter",
    //   base: 'file://' + path.join(__dirname, './src/style.css')
    // };

    // PDF.create(html, options).toFile(
    //   "./dist/index.pdf",
    //   (err, res) => {
    //     if (err) console.log(err);
    //     else console.log('Saved PDF');
    //   }
    // );
  });

  // CSS
  var css = fs.readFileSync(path.join(__dirname, "./src/style.css"));

  fs.writeFile(path.join(dir, "./style.css"), css, err => {
    if (err) console.log(err);
    else console.log("Saved CSS");
  });

  // Getting all files in directory
  let files = fs.readdirSync(path.join(__dirname, "./src/questions"));

  // Getting only IMG files
  files = files.filter(file => file.endsWith(".png") || file.endsWith(".jpg"));

  // Creating directory
  var imagesDIR = path.join(dir, "./images");
  if (!fs.existsSync(imagesDIR)) {
    fs.mkdirSync(imagesDIR, 0744);
  }

  files.forEach(file => {
    let img = fs.readFileSync(path.join(__dirname, `./src/questions/${file}`));

    fs.writeFile(path.join(imagesDIR, `./${file}`), img, err => {
      if (err) console.log(err);
    });
  });

  console.log("Saved Images");
};

getQuestions(questions => {
  deployHTML(renderHTML(questions.reverse()));
});
