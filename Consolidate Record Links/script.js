/*
Script Name:    Consolidate Record Links
Script Type:    Autoation Script only
Author:         Kamille Parks
Date:           2024-10-23
*/

const {
    TRIGGER_TABLE_ID,
    WATCHER_FIELD_ID,
    TRIGGER_RECORD_ID,

    LINKED_TABLE_ID
} = input.config()

const triggerTable = base.getTable(TRIGGER_TABLE_ID)
const triggerFields = triggerTable.fields
const watcherField = triggerTable.getField(WATCHER_FIELD_ID)

const triggerRecord = await triggerTable.selectRecordAsync(TRIGGER_RECORD_ID)

if(watcherField.type !== 'lastModifiedTime' && watcherField.type !== 'lastModifiedBy') {
  throw Error("The watcher field must be of type a 'last modified time' or last modified by'.")
}

// If the watcher field is of the correct type, extract the watched field ids
const referencedFieldIds = watcherField?.options?.referencedFieldIds ?? []

// Filter the watched fields to just those that are of the type 'multipleRecordLinks'
const watchedLinkFields = triggerFields.filter(x => {
  return (
    x.type === 'multipleRecordLinks' &&
    // x.options?.linkedTableId === LINKED_TABLE_ID && 
    referencedFieldIds.includes(x.id)
  )
})
console.log("Returning linked records for the following fields:")
console.log(watchedLinkFields.map(f => `${f.id} (${f.name})`).join('\n'))

// Get the records linked to the trigger record from each watched field, grouped by table id
// Sets are used to rremove duplicates
const allLinkedRecordIds = {}

watchedLinkFields.forEach(field => {
  let value = (triggerRecord?.getCellValue(field.id)?.map(v => v.id)) ?? []
  let linkedTableId = field.options?.linkedTableId ?? "n/a"
  if(value.length && linkedTableId) {
    if(!allLinkedRecordIds[linkedTableId]) {
      allLinkedRecordIds[linkedTableId] = new Set(value)
    } else {
      allLinkedRecordIds[linkedTableId].add(...value)
    }
  }
})

// Convert Sets to Arrays for Airtable output
const uniqueLinkedRecordIds = Object.fromEntries(Object.entries(allLinkedRecordIds).map(o => {
  let tableId = o[0]
  let values = o[1] ?? []
  return [tableId, new Array(...values)]
}))

console.log(uniqueLinkedRecordIds)
output.set("linkedRecordIds", uniqueLinkedRecordIds)