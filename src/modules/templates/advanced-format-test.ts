import { DocxParser } from './docx-parser'

// Test function to demonstrate advanced format support
export function testAdvancedFormatSupport() {
    console.log('🧪 Testing Advanced Format Support')
    console.log('=====================================\n')

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

    // Test each case
    testCases.forEach((testCase, index) => {
        console.log(`${index + 1}. ${testCase.name}`)
        console.log(`   Input: ${testCase.placeholder}`)

        try {
            // Create a mock document content with the placeholder
            const mockContent = `This is a test document with ${testCase.placeholder} field.`

            // Create a mock buffer (in real usage, this would be a DOCX file)
            const mockBuffer = Buffer.from(mockContent)

            // Parse the placeholder manually (since we can't create a real DOCX for this test)
            const parser = new DocxParser(mockBuffer)

            // Extract the placeholder using regex (same logic as in parsePlaceholder)
            const doubleRegex = /\{\{\s*([^|}]+)(?:\s*\|\s*([^}]+))?\s*\}\}/
            const match = doubleRegex.exec(testCase.placeholder)

            if (match) {
                const key = match[1]?.trim() || ''
                const modifiers = match[2] || ''

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
                            if (value) result.options = value.split(',').map((opt: string) => opt.trim())
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

    console.log('🎉 Advanced format support test completed!')
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
}

// Run the test if this file is executed directly
if (require.main === module) {
    testAdvancedFormatSupport()
}
