import * as XLSX from "xlsx";

/**
 * Download a sample template for exam questions
 */
export const downloadQuestionsTemplate = () => {
  try {
    const sampleData = [
      {
        'Question': 'What is 2 + 2?',
        'Option 1': '3',
        'Option 2': '4',
        'Option 3': '5',
        'Option 4': '6',
        'Correct Answer': 'B',
        'Marks': 1
      },
      {
        'Question': 'Which planet is known as the Red Planet?',
        'Option 1': 'Venus',
        'Option 2': 'Mars',
        'Option 3': 'Jupiter',
        'Option 4': 'Saturn',
        'Correct Answer': 'B',
        'Marks': 2
      },
      {
        'Question': 'What is the capital of France?',
        'Option 1': 'London',
        'Option 2': 'Berlin',
        'Option 3': 'Paris',
        'Option 4': 'Rome',
        'Correct Answer': 'C',
        'Marks': 1
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Question
      { wch: 20 }, // Option 1
      { wch: 20 }, // Option 2
      { wch: 20 }, // Option 3
      { wch: 20 }, // Option 4
      { wch: 15 }, // Correct Answer
      { wch: 10 }  // Marks
    ];

    XLSX.writeFile(workbook, 'exam_questions_template.xlsx');
  } catch (error) {
    console.error('Error generating questions template:', error);
    alert('Failed to download template. Please try again.');
  }
};

/**
 * Download a sample template for students
 */
export const downloadStudentsTemplate = () => {
  try {
    const sampleData = [
      {
        'Email': 'student1@example.com',
        'Password': 'password123',
        'Name': 'John Doe',
        'Registration Number': 'REG001',
        'Department': 'Computer Science'
      },
      {
        'Email': 'student2@example.com',
        'Password': 'password456',
        'Name': 'Jane Smith',
        'Registration Number': 'REG002',
        'Department': 'Information Technology'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    worksheet['!cols'] = [
      { wch: 30 }, // Email
      { wch: 15 }, // Password
      { wch: 25 }, // Name
      { wch: 20 }, // Registration Number
      { wch: 30 }  // Department
    ];

    XLSX.writeFile(workbook, 'students_template.xlsx');
  } catch (error) {
    console.error('Error generating students template:', error);
    alert('Failed to download template. Please try again.');
  }
};

/**
 * Validate file extension for Excel/CSV files
 */
export const isValidSpreadsheetFile = (fileName: string): boolean => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  return fileExtension === 'xlsx' || fileExtension === 'xls' || fileExtension === 'csv';
};

/**
 * Read and parse spreadsheet file
 */
export const parseSpreadsheetFile = (
  file: File,
  onSuccess: (data: any[]) => void,
  onError: (error: string) => void
): void => {
  if (!isValidSpreadsheetFile(file.name)) {
    onError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
    return;
  }

  const reader = new FileReader();

  reader.onerror = () => {
    console.error('Error reading file');
    onError('Error reading file. Please try again.');
  };

  reader.onload = (e) => {
    try {
      const data = e.target?.result;
      if (!data) {
        onError('No data found in file');
        return;
      }

      const workbook = XLSX.read(data, { type: 'binary' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        onError('No sheets found in file');
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        onError('No data found in file');
        return;
      }

      onSuccess(jsonData);
    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      onError('Error parsing file. Please check the format.');
    }
  };

  reader.readAsBinaryString(file);
};
