#!/usr/bin/env ts-node
/**
 * Data Conversion Script
 * Converts CSV files (projects, events) and JSON (people) into the unified data.json format
 * 
 * Usage: npm run convert-data
 * 
 * Input files (all in input_data/):
 *   - projects.csv: name,start,end,widthIncrement
 *   - events.csv: date,name,isKeyMoment,photo filename,caption
 *   - people.json: array of {name, joined, left}
 * 
 * Output:
 *   - public/data/events-timeline/data.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
interface Person {
  name: string;
  joined: string; // ISO date string
  left: string | null; // ISO date string or null
}

interface Project {
  name: string;
  start: string; // ISO date string
  end: string | null; // ISO date string or null
  widthIncrement: number;
}

interface Event {
  id: string;
  date: string; // ISO date string
  name: string;
  isKeyMoment: boolean;
  hasPhoto: boolean;
  caption: string | null;
}

interface TimelineData {
  startYear: number;
  endYear: number;
  people: Person[];
  projects: Project[];
  events: Event[];
}

/**
 * Parse CSV with simple comma splitting (no quoted field handling)
 */
function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote: "" inside quoted field
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator (only when not inside quotes)
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim());
    
    return fields;
  });
}

/**
 * Convert events CSV to Event objects
 */
function convertEvents(csvPath: string): Event[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  // Skip header row
  const dataRows = rows.slice(1);
  
  return dataRows.map((row, index) => {
    const [date, name, isKeyMomentStr, photoFilename, caption] = row;
    
    const isKeyMoment = isKeyMomentStr.toLowerCase() === 'true' || isKeyMomentStr === '1';
    const hasPhoto = Boolean(photoFilename && photoFilename.trim() !== '');
    
    // Generate event ID from photo filename if present, otherwise from index
    const id = hasPhoto ? photoFilename : `evt${index + 1}`;
    
    return {
      id,
      date,
      name,
      isKeyMoment,
      hasPhoto,
      caption: caption && caption.trim() !== '' ? caption : null,
    };
  });
}

/**
 * Convert projects CSV to Project objects
 */
function convertProjects(csvPath: string): Project[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  // Skip header row
  const dataRows = rows.slice(1);
  
  return dataRows.map(row => {
    const [name, start, end, widthIncrementStr] = row;
    
    return {
      name,
      start,
      end: end && end.trim() !== '' ? end : null,
      widthIncrement: parseInt(widthIncrementStr, 10),
    };
  });
}

/**
 * Load people from JSON file
 */
function loadPeople(jsonPath: string): Person[] {
  const content = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content) as Person[];
}

/**
 * Calculate start and end years from all dates in the dataset
 */
function calculateYearRange(people: Person[], projects: Project[], events: Event[]): { startYear: number; endYear: number } {
  const allDates: string[] = [];
  
  // Collect all dates
  people.forEach(p => {
    allDates.push(p.joined);
    if (p.left) allDates.push(p.left);
  });
  
  projects.forEach(p => {
    allDates.push(p.start);
    if (p.end) allDates.push(p.end);
  });
  
  events.forEach(e => {
    allDates.push(e.date);
  });
  
  // Parse dates and extract years
  const years = allDates.map(d => new Date(d).getFullYear());
  
  return {
    startYear: Math.min(...years),
    endYear: Math.max(...years),
  };
}

/**
 * Main conversion function
 */
function convertData(): void {
  const projectRoot = path.resolve(__dirname, '..');
  const inputDir = path.join(projectRoot, 'input_data');
  const outputPath = path.join(projectRoot, 'public', 'data', 'events-timeline', 'data.json');
  
  console.log('🔄 Converting data...');
  console.log(`Input directory: ${inputDir}`);
  console.log(`Output file: ${outputPath}`);
  
  // Check input files exist
  const projectsPath = path.join(inputDir, 'projects.csv');
  const eventsPath = path.join(inputDir, 'events.csv');
  const peoplePath = path.join(inputDir, 'people.json');
  
  if (!fs.existsSync(projectsPath)) {
    throw new Error(`Missing input file: ${projectsPath}`);
  }
  if (!fs.existsSync(eventsPath)) {
    throw new Error(`Missing input file: ${eventsPath}`);
  }
  if (!fs.existsSync(peoplePath)) {
    throw new Error(`Missing input file: ${peoplePath}`);
  }
  
  // Load and convert data
  console.log('📂 Loading projects.csv...');
  const projects = convertProjects(projectsPath);
  console.log(`   ✓ Loaded ${projects.length} projects`);
  
  console.log('📂 Loading events.csv...');
  const events = convertEvents(eventsPath);
  console.log(`   ✓ Loaded ${events.length} events`);
  
  console.log('📂 Loading people.json...');
  const people = loadPeople(peoplePath);
  console.log(`   ✓ Loaded ${people.length} people`);
  
  // Calculate year range
  const { startYear, endYear } = calculateYearRange(people, projects, events);
  console.log(`📅 Timeline range: ${startYear} - ${endYear}`);
  
  // Build final data structure
  const data: TimelineData = {
    startYear,
    endYear,
    people,
    projects,
    events,
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write output file
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log('✅ Data conversion complete!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Events: ${events.length} (${events.filter(e => e.hasPhoto).length} with photos)`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   People: ${people.length}`);
}

// Run conversion
try {
  convertData();
} catch (error) {
  console.error('❌ Error converting data:', error);
  process.exit(1);
}

