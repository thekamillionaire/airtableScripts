const settings = input.config({
   title: "Bulk rename linked record fields",
   description: `Use the name of the associated inverse link field to help rename linked record fields to avoid the "{{Table Name}} copy copy copy" problem`
})

const tableA = await input.tableAsync("Select a table that has linked record fields you want to rename")

const tableAFields = tableA.fields.filter(f => f.type === "multipleRecordLinks")

const linkedTableIds = new Set(tableAFields.map(f => f.options?.linkedTableId))
const linkedTables = base.tables.filter(t => linkedTableIds.has(t.id))

output.markdown(`---`)
output.markdown(`The **${tableA.name}** has links to **${linkedTables.length}** other tables`)

let selectTables = true
let tableChoices = linkedTables.map(t => {return {value: t.id, label: t.name}})

let nameFormatOptions = [
   {label: "{{Link Field Name}}"},
   {label: "{{Table Name}} - {{Link Field Name}}"},
   {label: "{{Table Name}} ({{Link Field Name}})"},
   {label: "{{Link Field Name}} ({{Table Name}})"},
   {label: "{{Link Field Name}}{{Suffix}}"},
]

while (selectTables == true && tableChoices.length > 0) {
   let tableBId = await input.buttonsAsync("Select a linked table", [...tableChoices, {value: false, label: "Done", variant: "primary"}])
   let tableB = linkedTables.find(t => t.id === tableBId)
   if(tableB) {
       tableChoices = tableChoices.filter(c => c.value != tableBId)

       let format = await input.buttonsAsync("Pick a naming convention", nameFormatOptions) ?? ""

       let suffix = ""

       if (format.toString().includes("{{Suffix}}")) {
           suffix = await input.textAsync("Define a suffix (include a leading space as necessary)")
       }

       let potentialFields = [...tableAFields.filter(f => f.options?.linkedTableId === tableBId)]
      
       let tableBFields = tableB.fields.filter(f => f?.options?.linkedTableId === tableA.id)

       output.markdown(`Using the selected format, the fields in the **${tableA.name}** table linking to the **${tableB.name}** table will look like this:`)
       let renameMap = [...potentialFields.map(f => {
           let inverseField = tableBFields.find(b => b.id === f.options.inverseLinkFieldId)
           let newName = format.toString()
               .replace("{{Link Field Name}}", inverseField.name)
               .replace("{{Table Name}}", tableB.name)
               .replace("{{Suffix}}", suffix)
           return {"id": f.id, "Current Field Name": f.name, "New Field Name": newName}
       })].filter(f => f["Current Field Name"] !== f["New Field Name"])
       output.table(renameMap)

       let fieldsToRename = [...renameMap.map(f => {
           let field = potentialFields.find(field => field.id === f.id)
           return {
               ...f,
               field: field
           }
       })]

       let proceed = await input.buttonsAsync(`Rename these fields?`, [{label: "Yes"}, {label: "No"}])

       if (proceed) {
           output.markdown(`⏳ Renaming ${renameMap.length} fields`)
           while (fieldsToRename.length) {
               let batch = fieldsToRename[0]
               if(batch.field) {
                   await batch.field.updateNameAsync(batch["New Field Name"])
               }
               fieldsToRename = fieldsToRename.filter(f => f.id !== batch.id)
           }
       }

   } else {
       selectTables = false
   }
}
