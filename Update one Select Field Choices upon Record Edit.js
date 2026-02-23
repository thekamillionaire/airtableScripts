let table = base.getTable("Table 1")

let field = table.getField("Select")

output.table(field)

let payload = [
    {fields: {"Select": {name: "6"}}},
    {fields: {"Select": {name: "6"}}},
    {fields: {"Select": {name: "8"}}},
]

let existingOptions = field.options.choices.map(x => x.name)

output.table(payload.map(x => x.fields))

let payloadOptions = new Set(payload.map(x => x.fields["Select"].name))

output.inspect(payloadOptions)

if(payloadOptions) {
    let arr = new Array(...payloadOptions)
    let missing = []

    arr.forEach(option => {
        let exist = existingOptions.includes(option)

        if (!exist) {missing.push({name: option})}
    })

    await field.updateOptionsAsync({
        choices: [...field.options.choices, ...missing]
    })
}


await table.createRecordsAsync(payload)
