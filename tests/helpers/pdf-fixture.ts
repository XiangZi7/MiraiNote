/** Synthetic PDF with repeated words, split CJK glyphs and enough pages to exercise virtualization. */
export function searchPdfFixture(pages = 6) {
  const objects: string[] = []
  const add = (value: string) => {
    objects.push(value)
    return objects.length
  }
  add('')
  add('')
  const latin = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const descriptor = add(
    '<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [-25 -254 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 80 >>'
  )
  const cid = add(
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /FontDescriptor ${descriptor} 0 R /DW 1000 >>`
  )
  const chinese = add(
    `<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [${cid} 0 R] >>`
  )
  const kids: number[] = []
  for (let page = 1; page <= pages; page++) {
    const stream = [
      `BT /F1 20 Tf 60 750 Td (Page ${page}: needle at the top) Tj ET`,
      'BT /F2 22 Tf 60 660 Td <5B8C> Tj /F2 23 Tf <6574> Tj /F2 22 Tf <7248> Tj ET',
      `BT /F1 16 Tf 60 100 Td (Page ${page}: another needle at the bottom) Tj ET`,
    ].join('\n')
    const contents = add(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
    )
    kids.push(
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${latin} 0 R /F2 ${chinese} 0 R >> >> /Contents ${contents} 0 R >>`
      )
    )
  }
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${kids.map(id => `${id} 0 R`).join(' ')}] /Count ${pages} >>`
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets
    .slice(1)
    .map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf)
}
