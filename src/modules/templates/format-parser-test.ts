// Simple test to demonstrate advanced format parsing
function testPlaceholderParsing() {
    console.log('🧪 Testing Advanced Format Parsing Logic')
    console.log('=========================================\n')

    // Test cases based on your examples
    const testCases = [
        {
            name: 'Image with dimensions',
            placeholder: '{{ logo | type=image | width=120 | height=40 }}',
            expected: {
                key: 'logo',
                type: 'image',
                width: 120,
                height: 40
            }
        },
        {
            name: 'Number with constraints',
            placeholder: '{{ salary | type=number | min=0 | step=0.01 }}',
            expected: {
                key: 'salary',
                type: 'number',
                min: 0,
                step: 0.01
            }
        },
        {
            name: 'Text with label and required',
            placeholder: '{{ employeeName | type=text | label="Employee Name" | required }}',
            expected: {
                key: 'employeeName',
                type: 'text',
                label: 'Employee Name',
                required: true
            }
        },
        {
            name: 'Date field',
            placeholder: '{{ hireDate | type=date }}',
            expected: {
                key: 'hireDate',
                type: 'date'
            }
        },
        {
            name: 'Select with options and default',
            placeholder: '{{ gender | type=select | options="Male,Female,Other" | default="Male" }}',
            expected: {
                key: 'gender',
                type: 'select',
                options: ['Male', 'Female', 'Other'],
                default: 'Male'
            }
        },
        {
            name: 'Text with maxLength',
            placeholder: '{{ description | type=text | maxLength=500 }}',
            expected: {
                key: 'description',
                type: 'text',
                maxLength: 500
            }
        },
        {
            name: 'Number with min/max',
            placeholder: '{{ age | type=number | min=18 | max=65 }}',
            expected: {
                key: 'age',
                type: 'number',
                min: 18,
                max: 65
            }
        }
    ]

    // Parse placeholder function (same logic as in DocxParser)
    function parsePlaceholder(text: string): any {
        // Match both {{ variable | key=value }} and {variable} formats
        const doubleRegex = /\{\{\s*([^|}]+)(?:\s*\|\s*([^}]+))?\s*\}\}/
        const singleRegex = /\{([^{}|]+)\}/

        let match = doubleRegex.exec(text)
        let modifiers = ''

        if (!match) {
            match = singleRegex.exec(text)
            if (!match) return null
        } else {
            modifiers = match[2] || ''
        }

        let key = match[1]?.trim() || match[3]?.trim() || ''

        // Clean up the key - remove extra spaces and normalize
        key = key.replace(/\s+/g, ' ').trim()

        // If key is empty, skip this placeholder
        if (!key) return null

        const result: any = { key, type: 'text' }

        // Parse modifiers
        const modifierRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
        let modifierMatch

        while ((modifierMatch = modifierRegex.exec(modifiers)) !== null) {
            const [, modifierKey, quotedValue, singleQuotedValue, unquotedValue] = modifierMatch
            const value = quotedValue || singleQuotedValue || unquotedValue

            switch (modifierKey) {
                case 'type':
                    if (value) result.type = value
                    break
                case 'label':
                    if (value) result.label = value
                    break
                case 'required':
                    result.required = value === 'true' || value === ''
                    break
                case 'maxLength':
                    if (value) result.maxLength = parseInt(value, 10)
                    break
                case 'min':
                    if (value) result.min = parseFloat(value)
                    break
                case 'max':
                    if (value) result.max = parseFloat(value)
                    break
                case 'step':
                    if (value) result.step = parseFloat(value)
                    break
                case 'options':
                    if (value) result.options = value.split(',').map(opt => opt.trim())
                    break
                case 'default':
                    if (value) result.default = value
                    break
                case 'width':
                    if (value) result.width = parseInt(value, 10)
                    break
                case 'height':
                    if (value) result.height = parseInt(value, 10)
                    break
            }
        }

        return result
    }

    // Test each case
    testCases.forEach((testCase, index) => {
        console.log(`${index + 1}. ${testCase.name}`)
        console.log(`   Input: ${testCase.placeholder}`)

        try {
            const result = parsePlaceholder(testCase.placeholder)

            if (result) {
                console.log(`   ✅ Parsed:`, result)

                // Check if all expected properties match
                const allMatch = Object.entries(testCase.expected).every(([key, value]) => {
                    if (Array.isArray(value)) {
                        return JSON.stringify(result[key]) === JSON.stringify(value)
                    }
                    return result[key] === value
                })

                if (allMatch) {
                    console.log(`   ✅ All properties match expected values`)
                } else {
                    console.log(`   ❌ Some properties don't match`)
                    console.log(`   Expected:`, testCase.expected)
                    console.log(`   Got:`, result)
                }
            } else {
                console.log(`   ❌ Failed to parse placeholder`)
            }
        } catch (error) {
            console.log(`   ❌ Error:`, error)
        }

        console.log('')
    })

    console.log('🎉 Advanced format parsing test completed!')
    console.log('\n📋 Supported Parameters:')
    console.log('   • type: text, number, date, select, image')
    console.log('   • label: "Custom Label"')
    console.log('   • required: true/false')
    console.log('   • maxLength: number')
    console.log('   • min: number')
    console.log('   • max: number')
    console.log('   • step: number')
    console.log('   • options: "option1,option2,option3"')
    console.log('   • default: "default value"')
    console.log('   • width: number (for images)')
    console.log('   • height: number (for images)')

    console.log('\n📝 Example Usage:')
    console.log('   {{ logo | type=image | width=120 | height=40 }}')
    console.log('   {{ salary | type=number | min=0 | step=0.01 }}')
    console.log('   {{ employeeName | type=text | label="Employee Name" | required }}')
    console.log('   {{ hireDate | type=date }}')
    console.log('   {{ gender | type=select | options="Male,Female,Other" | default="Male" }}')
}

// Run the test
testPlaceholderParsing()
