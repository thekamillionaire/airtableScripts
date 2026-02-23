/*
Script Name:    Relational Field Renamer
Script Type:    Script Extension only
Author:         Kamille Parks
Date:           2026-02-22
*/

const settings = input.config({
    title: "Bulk rename relation fields",
    description: `Use the name of the associated inverse link field to help rename linked record fields, lookups, and rollups to avoid the "{{Table Name}} copy copy copy" problem`
})

const tableA = await input.tableAsync("Select a table that has fields you want to rename. The table should have at least one linked record field.")

// Gather applicable tables that link to "Table A"
const tableALinkFields = tableA.fields.filter(f => f.type === "multipleRecordLinks")
const linkedTableIds = new Set(tableALinkFields.map(f => f.options?.linkedTableId))
const linkedTables = base.tables.filter(t => linkedTableIds.has(t.id))

let tableChoices = linkedTables.map(t => { return { value: t.id, label: t.name, variant: "primary" } })

// Establish a variable to help loop through potential tables
let processFields = true

// The following options present standardized formats that the associated fields can be renamed to match
let nameFormatOptions_linkFields = [
    { label: "{{Link Field Name}}" },
    { label: "{{Table Name}} - {{Link Field Name}}" },
    { label: "{{Table Name}} ({{Link Field Name}})" },
    { label: "{{Link Field Name}} ({{Table Name}})" },
    { label: "{{Link Field Name}}{{Suffix}}" },
    { label: "SKIP", variant: "danger" },
]

let nameFormatOptions_lookupFields = [
    { label: "{{Reference Field Name}}" },
    { label: "{{Reference Field Name}}{{Suffix}}" },
    { label: "{{Reference Field Name}} (from {{Link Field Name}})" },
    { label: "{{Reference Field Name}} ({{Link Field Name}})" },
    { label: "{{Link Field Name}} {{Reference Field Name}}" },
    { label: "SKIP", variant: "danger" },
]

while (processFields == true && tableChoices.length > 0) {
    output.clear()
    let tableBId = await input.buttonsAsync(`Select a table that has at least one link to ${tableA.name}`, [...tableChoices, { value: false, label: "STOP", variant: "danger" }])
    let tableB = linkedTables.find(t => t.id === tableBId)
    if (!tableB) {
        // If a table wasn't selected, end the loop and terminate the script
        processFields = false
    } else {
        // Remove the selected table from the list so it can't be selected twice
        tableChoices = tableChoices.filter(c => c.value != tableBId)

        // Applicable fields include record links, lookups, & rollups.
        let linkFields = [...tableALinkFields.filter(f => f.options?.linkedTableId === tableBId)]

        // If a table was selected, find link/lookup/rollup fields in that table that link to Table A

        let formattedFields_link = await getFormattedFields({tableA, tableB, linkFields, fieldType: "multipleRecordLinks", formatOptions: nameFormatOptions_linkFields})
        let formattedFields_lookup = await getFormattedFields({tableA, tableB, linkFields, fieldType: "multipleLookupValues", formatOptions: nameFormatOptions_lookupFields})
        let formattedFields_rollup = await getFormattedFields({tableA, tableB, linkFields, fieldType: "rollup", formatOptions: nameFormatOptions_lookupFields})

        let formattedFields = [
            ...formattedFields_link,
            ...formattedFields_lookup,
            ...formattedFields_rollup
        ]

        if(!formattedFields.length) {
            output.markdown("There are no fields to rename based on your inputs.")
        } else {
            output.markdown("Proposed name changes:")
            output.table(formattedFields)

            await renameFields({tableA, formattedFields})
        }
    }
}

output.clear()
output.markdown(`All Done!`)

function formatFieldNames(props) {
    let {tableA, tableB, fieldType, linkFields, selectedNameFormat, suffix} = props

    let linkFieldIds = linkFields.map(x => x.id)

    let renamableFields = []

    tableA.fields.forEach(f => {
        if(f.type === fieldType) {
            if(f.type === "multipleRecordLinks" && f.options?.linkedTableId === tableB.id) {
                let inverseField = tableB.fields.find(b => b.id === f.options.inverseLinkFieldId)
                renamableFields.push({fieldType, id: f.id, currentName: f.name, linkFieldName: inverseField.name})
            } else if(
                (f.type === "multipleLookupValues" && linkFieldIds.includes(f.options?.recordLinkFieldId)) || 
                (f.type === "rollup" && linkFieldIds.includes(f.options?.recordLinkFieldId))
            ) {
                let linkField = tableA.fields.find(a => a.id === f.options?.recordLinkFieldId)
                let referenceField = tableB.fields.find(b => b.id === f.options?.fieldIdInLinkedTable)
                renamableFields.push({fieldType, id: f.id, currentName: f.name, linkFieldName: linkField.name, referenceFieldName: referenceField.name})
            }
        }
    })

    let renamedFields = renamableFields.map(f => {
        let proposedName = selectedNameFormat.toString()
            .replace("{{Link Field Name}}", f.linkFieldName)
            .replace("{{Reference Field Name}}", f.referenceFieldName)
            .replace("{{Table Name}}", tableB.name)
            .replace("{{Suffix}}", suffix)
        return {...f, proposedName }
    })

    return renamedFields
}

async function getFormattedFields(props) {
    let {fieldType, formatOptions} = props

    let selectedNameFormat = await input.buttonsAsync(`Pick a naming convention for [${fieldType}] fields`, formatOptions) ?? "SKIP"
    let suffix = ""
    if(selectedNameFormat.toString().includes("{{Suffix}}")) {
        suffix = await input.textAsync("Define a suffix (include a leading space as necessary)")
    }

    if (selectedNameFormat === "SKIP") {
        return []
    } else {
        let formattedFieldNames = formatFieldNames({...props,selectedNameFormat, suffix})
        return formattedFieldNames.map(x => ({id: x.id, currentName: x.currentName, proposedName: x.proposedName})).filter(x => x.currentName !== x.proposedName)
    }
}

async function renameFields(props) {
    let {tableA, formattedFields} = props

    let shouldRenameFields = await input.buttonsAsync(`Rename these fields?`, [{ label: "Yes", value: true, variant: "primary" }, { label: "No", value: false, variant: "danger" }])

    if (!shouldRenameFields) {
        // Do nothing, continue loop so user can select a new table if there are any
    } else {
        output.markdown(`⏳ Renaming ${formattedFields.length} fields`)
        while (formattedFields.length) {
            let batch = formattedFields[0]
            let field = tableA.getField(batch.id)
            if (field) {
                await field.updateNameAsync(batch.proposedName)
            }
            formattedFields = formattedFields.filter(f => f.id !== batch.id)
        }
    }
}