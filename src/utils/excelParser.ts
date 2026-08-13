import * as XLSX from 'xlsx';
import { Question } from '../types';

export interface ParseResult {
  validQuestions: Omit<Question, 'id' | 'questionBankId'>[];
  errors: { row: number; error: string }[];
}

export const parseExcelQuestions = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const validQuestions: Omit<Question, 'id' | 'questionBankId'>[] = [];
        const errors: { row: number; error: string }[] = [];

        rawData.forEach((row, index) => {
          const rowNum = index + 2; // Assuming row 1 is header

          // Validate required fields
          if (!row['Question']) {
            errors.push({ row: rowNum, error: 'Missing Question text' });
            return;
          }
          if (!row['Option A'] || !row['Option B'] || !row['Option C'] || !row['Option D']) {
            errors.push({ row: rowNum, error: 'Missing one or more options (A, B, C, D)' });
            return;
          }
          
          const correct = String(row['Correct Answer']).toUpperCase().trim();
          if (!['A', 'B', 'C', 'D'].includes(correct)) {
            errors.push({ row: rowNum, error: `Invalid Correct Answer: "${correct}". Must be A, B, C, or D.` });
            return;
          }

          if (!row['Category']) {
            errors.push({ row: rowNum, error: 'Missing Category' });
            return;
          }

          const difficulty = String(row['Difficulty']);
          if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
            errors.push({ row: rowNum, error: `Invalid Difficulty: "${difficulty}". Must be Easy, Medium, or Hard.` });
            return;
          }

          let marks = Number(row['Marks']);
          if (isNaN(marks) || marks <= 0) {
            marks = 1; // Default
          }

          validQuestions.push({
            question: String(row['Question']),
            options: {
              A: String(row['Option A']),
              B: String(row['Option B']),
              C: String(row['Option C']),
              D: String(row['Option D']),
            },
            correctAnswer: correct as 'A' | 'B' | 'C' | 'D',
            category: String(row['Category']),
            difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
            marks,
            explanation: row['Explanation'] ? String(row['Explanation']) : undefined,
          });
        });

        resolve({ validQuestions, errors });
      } catch (err) {
        reject(new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export const downloadTemplate = () => {
  const templateData = [
    {
      'Question': 'What is 20% of 200?',
      'Option A': '20',
      'Option B': '30',
      'Option C': '40',
      'Option D': '50',
      'Correct Answer': 'C',
      'Category': 'Aptitude',
      'Difficulty': 'Easy',
      'Marks': 1,
      'Explanation': '20/100 * 200 = 40'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  
  XLSX.writeFile(wb, "Question_Bank_Template.xlsx");
};
