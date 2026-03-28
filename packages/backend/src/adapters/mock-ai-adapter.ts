import type { AiPort } from './ai-port';

// === Mock AI Adapter ===
// Returns a hardcoded minimal IFC file for development/testing.
// For a richer offline experience, install Ollama and set USE_LOCAL_LLM=true.
// See README.md for Ollama setup instructions.

// Minimal valid IFC2x3 file: a single wall
const SAMPLE_IFC = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('sample.ifc','2024-01-01',('AI Generated'),('construction-ifc-tools'),'','','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCPROJECT('0001',#2,'AI Generated Project',$,$,$,$,$,(#20));
#2=IFCOWNERHISTORY(#3,#6,$,.ADDED.,$,$,$,0);
#3=IFCPERSONANDORGANIZATION(#4,#5,$);
#4=IFCPERSON($,'AI','Developer',$,$,$,$,$);
#5=IFCORGANIZATION($,'construction-ifc-tools',$,$,$);
#6=IFCAPPLICATION(#5,'1.0','construction-ifc-tools','CIT');
#10=IFCCARTESIANPOINT((0.,0.,0.));
#11=IFCDIRECTION((0.,0.,1.));
#12=IFCDIRECTION((1.,0.,0.));
#13=IFCAXIS2PLACEMENT3D(#10,#11,#12);
#14=IFCLOCALPLACEMENT($,#13);
#20=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#13,$);
#30=IFCSITE('1001',$,'Sample Site',$,$,#14,$,$,.ELEMENT.,$,$,$,$,$);
#31=IFCBUILDING('1002',$,'Sample Building',$,$,#14,$,$,.ELEMENT.,$,$,$);
#32=IFCBUILDINGSTOREY('1003',$,'Ground Floor',$,$,#14,$,$,.ELEMENT.,0.);
#40=IFCWALLSTANDARDCASE('2001',$,'Wall-001','Sample Wall',$,#14,$,$);
#41=IFCDOOR('2002',$,'Door-001','Sample Door',$,#14,$,$,1.0,2.1);
#42=IFCWINDOW('2003',$,'Window-001','Sample Window',$,#14,$,$,1.2,1.5);
#50=IFCRELAGGREGATES('3001',$,$,$,#1,(#30));
#51=IFCRELAGGREGATES('3002',$,$,$,#30,(#31));
#52=IFCRELAGGREGATES('3003',$,$,$,#31,(#32));
#53=IFCRELCONTAINEDINSPATIALSTRUCTURE('3004',$,$,$,(#40,#41,#42),#32);
ENDSEC;
END-ISO-10303-21;`;

export class MockAiAdapter implements AiPort {
  async generateIfc(prompt: string): Promise<string> {
    console.log(`[MockAI] Received prompt: "${prompt}"`);
    console.log('[MockAI] Returning hardcoded sample IFC (use Ollama for real local generation)');
    // In mock mode, always return a valid sample IFC regardless of prompt
    return SAMPLE_IFC;
  }

  async answerQuestion(question: string, graphContext: string): Promise<string> {
    console.log(`[MockAI] Question: "${question}"`);
    // Provide a mock answer based on the context
    return `[Mock AI Response] Based on the graph data, here is a simulated answer to "${question}". In production, Bedrock Claude 4.5 Sonnet will provide accurate answers based on the actual graph database context.`;
  }
}
