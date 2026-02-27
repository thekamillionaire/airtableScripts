/*
Script Name:    Metadata Helper: Field Name Find & Replace
Script Type:    Script Extension only
Author:         Kamille Parks
Date:           2026-02-27
*/

const settings = input.config({
    title: "Metadata Helper: Field Name Find & Replace",
    description: `Use this script in conjunction with a "metadata extractor" script to use a table of fields and bulk rename fields.`,
    items: [
        input.config.table("fieldsTable", {
            label: "Metadata Table: Fields",
            description: "Each record in this table should represent a field on a table within this base"
        }),
        input.config.field("tableIdField", {
            label: "Table ID Field",
            description: "Values in this field should contain field ids (e.g. tblXXXXXXXXXXXXXX)",
            parentTable: "fieldsTable"
        }),
        input.config.field("fieldIdField", {
            label: "Field ID Field",
            description: "Values in this field should contain field ids (e.g. fldXXXXXXXXXXXXXX)",
            parentTable: "fieldsTable"
        }),
        input.config.field("fieldNameField", {
            label: "Field Name Field",
            description: "Values in this field should contain the current name of the field",
            parentTable: "fieldsTable"
        }),
        input.config.view("fieldsView", {
            label: "Fields to Rename",
            description: "This view should contain all the records you wish to rename",
            parentTable: "fieldsTable"
        }),
        
    ]
})

const {fieldsTable,fieldsView,tableIdField,fieldIdField,fieldNameField} = settings

const recordsQuery = await fieldsView.selectRecordsAsync({fields: [tableIdField,fieldNameField,fieldIdField]})

const {records} = recordsQuery

let fieldUpdates = records.map(r => ({
    tableId: r.getCellValueAsString(tableIdField),
    fieldId: r.getCellValueAsString(fieldIdField),
    currentName: r.getCellValueAsString(fieldNameField),
    proposedName: "",
    isModified: false
}))


// Establish a variable to help loop through potential tables
let processFields = true

while (processFields == true) {
    output.clear()
    output.markdown("### 1️⃣ Propose Modifications")
    let modifiedCount = fieldUpdates.filter(f => f.isModified).length
    if(modifiedCount) {
        output.markdown("**Proposed Changes**")
        output.table(fieldUpdates)
    }
    const operation = await input.buttonsAsync("Pick an operation (this will repeat until CONFIRM is selected)", [
        {label: "Find & Replace", value: "replace"},
        {label: "Add Prefix", value: "prefix"},
        {label: "Add Suffix", value: "suffix"},
        {label: "CONFIRM", value: "end", variant: "primary"}
    ])

    if(operation === "replace") {
        let findString = await input.textAsync("Find")
        let replaceString = await input.textAsync("Replace")

        fieldUpdates = fieldUpdates.map(f => {
            let nameToModify = f.proposedName.length ? f.proposedName : f.currentName
            let proposedName = nameToModify.replace(findString, replaceString).trim()
            let isModified = (proposedName !== f.currentName) ? true : false

            return {...f,proposedName,isModified}
        })
    }

    if(operation === "prefix") {
        let prefix = await input.textAsync("Prefix (include a trailing space as necessary)")
        fieldUpdates = fieldUpdates.map(f => {
            let nameToModify = f.proposedName.length ? f.proposedName : f.currentName
            let proposedName = `${prefix}${nameToModify}`
            let isModified = (proposedName !== f.currentName) ? true : false

            return {...f,proposedName,isModified}
        })
    }

    if(operation === "suffix") {
        let suffix = await input.textAsync("Prefix (include a leading space as necessary)")
        fieldUpdates = fieldUpdates.map(f => {
            let nameToModify = f.proposedName.length ? f.proposedName : f.currentName
            let proposedName = `${nameToModify}${suffix}`
            let isModified = (proposedName !== f.currentName) ? true : false

            return {...f,proposedName,isModified}
        })
    }

    if(operation === "end") {
        processFields = false
    }
}

output.clear()
output.markdown("### 2️⃣ Confirm Changes")
output.markdown("**Proposed Changes**")

let modifiedFields = fieldUpdates.filter(f => f.isModified)

if(!modifiedFields.length) {
    output.markdown("There are no fields to modify")
} else {
    await renameFields({modifiedFields})
    output.markdown(`All Done!`)
}


async function renameFields(props) {
    let {modifiedFields} = props

    output.table(modifiedFields)
    let shouldRenameFields = await input.buttonsAsync(`Rename these fields?`, [{ label: "Yes", value: true, variant: "primary" }, { label: "No", value: false, variant: "danger" }])

    if (!shouldRenameFields) {
        // Do nothing, continue loop so user can select a new table if there are any
    } else {
        output.markdown(`⏳ Renaming ${modifiedFields.length} fields`)

        while (modifiedFields.length) {
            let batch = modifiedFields[0]
            let table = base.getTable(batch.tableId)
            let field = table.getField(batch.fieldId)
            if (field) {
                await field.updateNameAsync(batch.proposedName)
            }
            modifiedFields = modifiedFields.filter(f => f.fieldId !== batch.fieldId)
        }
    }
}