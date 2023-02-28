const parentTable = base.getTable('Projects')
const parentQuery = await parentTable.selectRecordsAsync({fields: ['Type', 'Tasks', 'Template (from Tasks)']})
const parentRecords = parentQuery.records

const templatesTable = base.getTable('Levels')
const templatesQuery = await templatesTable.selectRecordsAsync({fields: ["Template Tasks"]})
const templatesRecords = templatesQuery.records

const childTable = base.getTable('Tasks')

let updates = parentRecords.flatMap(parent => {
    let templateValue = parent.getCellValue('Type')
    let template = templatesQuery.getRecord(templateValue[0].id)

    if (template) {
        let templateTasks = template.getCellValue('Template Tasks')
        let linkedTemplates = parent.getCellValue('Template (from Tasks)')?.map(x => x.id) || []
        let missingTemplates = templateTasks.filter(x => !linkedTemplates.includes(x.id))

        return missingTemplates.map(x => {
            return  {fields: {
                'Project':  [{id: parent.id}],
                'Template': [{id: x.id}],
            }}
        })
    }
}).filter(x => x)

output.table(updates.map(x => x.fields))

while (updates.length > 0) {
    output.markdown(`Creating missing child records, starting at parent #${updates[0].fields['Project'][0].id}, ${updates.length} records remaining`)
    await childTable.createRecordsAsync(updates.slice(0, 50))
    updates = updates.slice(50)
}
