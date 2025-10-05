import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const graphPath = path.join(process.cwd(), 'public', 'data', 'graph.json');
    
    if (!fs.existsSync(graphPath)) {
      return NextResponse.json(
        { error: 'Graph data not found' }, 
        { status: 404 }
      );
    }

    const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    
    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error loading graph data:', error);
    return NextResponse.json(
      { error: 'Failed to load graph data' }, 
      { status: 500 }
    );
  }
}
