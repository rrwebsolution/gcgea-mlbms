import fs from "node:fs"
import { getDocument } from "./node_modules/pdfjs-dist/legacy/build/pdf.mjs"
import { createCanvas } from "./node_modules/@napi-rs/canvas/index.js"

for (const path of process.argv.slice(2)) {
  const data = new Uint8Array(fs.readFileSync(path))
  const document = await getDocument({ data, disableWorker: true }).promise
  console.log(`\n=== ${path} (${document.numPages} pages) ===`)
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    console.log(`\n--- PAGE ${pageNumber} ---`)
    console.log(content.items.map((item) => item.str).join(" "))
    const viewport = page.getViewport({ scale: 2 })
    const canvas = createCanvas(viewport.width, viewport.height)
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise
    const prefix = path.includes("24_2026") ? "resolution24" : "resolution27"
    fs.writeFileSync(new URL(`./${prefix}-page${pageNumber}.png`, import.meta.url), canvas.toBuffer("image/png"))
  }
}
