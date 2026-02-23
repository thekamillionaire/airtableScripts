## Script Description
This script allows records linked across multiple fields to be automatically consolidated into a separate linked record field.

## How To Use This Script
1. Create a `Linked to another record` field to house the values of all of 2 or more other linked record fields. If multiple table relationships need consolidation, create one per table.
   * **RECOMMENDED:** Set the field permissions for the consolidated fields to be "Nobody" with "Allow automations to edit" enabled. This will help prevent inconsistenncies between the consolidated field and the individual linked record fields.
2. Create a "watcher" field of the type `Last Modified Time` or `Last Modified By` configured to target the linked record fields that should be consolidated, but not the linked record field created in **Step 1** that will house all the links.
   * **NOTE:** *The script can handle consolidating linked relationships from multiple tables in a single automation step! No need to duplicate per watched table.*
3. Create an automation that is triggered when the "watcher" field is updated.
4. Add a "Run a script" action step and paste the provided script. Insert values for the required configuation variables.
5. Add a "Update record" step that takes the output of the script and inserts it into the consolidation field(s) created in **Step 1**. Alternatively, you can modify the script to perform the update action directly.