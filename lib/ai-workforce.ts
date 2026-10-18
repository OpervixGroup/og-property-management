export type StaffProfile={id:string;name:string;role:string;office:string;reportsTo:string|null;executive:boolean;human:boolean};
// AI names are fictional role labels, not provisioned identities or proof of execution.
export const staff:StaffProfile[]=[
 {
  "id": "ceo",
  "name": "Miguel Antonio Martínez",
  "role": "Founder & CEO",
  "office": "ceo",
  "reportsTo": null,
  "executive": true,
  "human": true
 },
 {
  "id": "coo",
  "name": "Alejandro Torres",
  "role": "AI Chief Operating Officer",
  "office": "operations",
  "reportsTo": "ceo",
  "executive": true,
  "human": false
 },
 {
  "id": "cfo",
  "name": "Lucía Herrera",
  "role": "AI Chief Financial Officer",
  "office": "finance",
  "reportsTo": "ceo",
  "executive": true,
  "human": false
 },
 {
  "id": "sales-vp",
  "name": "Diego Navarro",
  "role": "AI VP of Sales",
  "office": "sales",
  "reportsTo": "coo",
  "executive": true,
  "human": false
 },
 {
  "id": "cmo",
  "name": "Isabella Reyes",
  "role": "AI Chief Marketing Officer",
  "office": "sales",
  "reportsTo": "coo",
  "executive": true,
  "human": false
 },
 {
  "id": "cto",
  "name": "Mateo Salazar",
  "role": "AI Chief Technology Officer",
  "office": "technology",
  "reportsTo": "coo",
  "executive": true,
  "human": false
 },
 {
  "id": "ai-resources",
  "name": "Camila Vega",
  "role": "Chief AI Resources & Capacity Officer",
  "office": "people",
  "reportsTo": "coo",
  "executive": true,
  "human": false
 },
 {
  "id": "controller",
  "name": "Andrés Castillo",
  "role": "AI VP Finance / Controller",
  "office": "finance",
  "reportsTo": "cfo",
  "executive": true,
  "human": false
 },
 {
  "id": "legal-lead",
  "name": "Sofía Morales",
  "role": "AI VP Legal & Compliance Support",
  "office": "legal",
  "reportsTo": "cfo",
  "executive": true,
  "human": false
 },
 {
  "id": "cpo",
  "name": "Valentina Cruz",
  "role": "AI Chief Product Officer",
  "office": "technology",
  "reportsTo": "cto",
  "executive": true,
  "human": false
 },
 {
  "id": "secretary",
  "name": "Elena Ríos",
  "role": "AI Executive Secretary / Chief of Staff",
  "office": "secretary",
  "reportsTo": "ceo",
  "executive": false,
  "human": false
 },
 {
  "id": "strategy",
  "name": "Gabriel Mendoza",
  "role": "AI Director of Strategy & Growth",
  "office": "sales",
  "reportsTo": "ceo",
  "executive": false,
  "human": false
 },
 {
  "id": "operations-lead",
  "name": "Santiago Ortiz",
  "role": "AI Director of Operations",
  "office": "operations",
  "reportsTo": "coo",
  "executive": false,
  "human": false
 },
 {
  "id": "project-manager",
  "name": "Mariana Flores",
  "role": "AI Workflow & Project Coordinator",
  "office": "operations",
  "reportsTo": "operations-lead",
  "executive": false,
  "human": false
 },
 {
  "id": "vendor-coordinator",
  "name": "Carolina Suárez",
  "role": "AI Vendor Workflow Coordinator",
  "office": "operations",
  "reportsTo": "operations-lead",
  "executive": false,
  "human": false
 },
 {
  "id": "account-executive",
  "name": "Emilio Santos",
  "role": "AI Account Executive / Proposal Preparer",
  "office": "sales",
  "reportsTo": "sales-vp",
  "executive": false,
  "human": false
 },
 {
  "id": "research",
  "name": "Daniela Paz",
  "role": "AI Market Research & Content Specialist",
  "office": "sales",
  "reportsTo": "cmo",
  "executive": false,
  "human": false
 },
 {
  "id": "engineering-lead",
  "name": "Nicolás Romero",
  "role": "AI Engineering Lead",
  "office": "technology",
  "reportsTo": "cto",
  "executive": false,
  "human": false
 },
 {
  "id": "developer",
  "name": "Ana Lucía Duarte",
  "role": "AI Software Developer",
  "office": "technology",
  "reportsTo": "engineering-lead",
  "executive": false,
  "human": false
 },
 {
  "id": "quality",
  "name": "Isabel Fuentes",
  "role": "AI QA & Acceptance Analyst",
  "office": "technology",
  "reportsTo": "engineering-lead",
  "executive": false,
  "human": false
 },
 {
  "id": "designer",
  "name": "Luciana Vargas",
  "role": "AI Product & Experience Designer",
  "office": "technology",
  "reportsTo": "cpo",
  "executive": false,
  "human": false
 },
 {
  "id": "security",
  "name": "Rafael Cabrera",
  "role": "AI Security & Privacy Analyst",
  "office": "risk",
  "reportsTo": "cto",
  "executive": false,
  "human": false
 },
 {
  "id": "capacity",
  "name": "Adriana León",
  "role": "AI Capacity Planner",
  "office": "people",
  "reportsTo": "ai-resources",
  "executive": false,
  "human": false
 },
 {
  "id": "orchestration",
  "name": "Tomás Medina",
  "role": "AI Workflow Orchestration Coordinator",
  "office": "people",
  "reportsTo": "ai-resources",
  "executive": false,
  "human": false
 },
 {
  "id": "knowledge",
  "name": "Lola Serrano",
  "role": "AI Knowledge & Training Curator",
  "office": "people",
  "reportsTo": "ai-resources",
  "executive": false,
  "human": false
 },
 {
  "id": "evaluation",
  "name": "Esteban Molina",
  "role": "AI Evaluation & Reliability Analyst",
  "office": "people",
  "reportsTo": "ai-resources",
  "executive": false,
  "human": false
 },
 {
  "id": "receivables",
  "name": "Camilo Aguilar",
  "role": "AI A/R Preparation Analyst",
  "office": "finance",
  "reportsTo": "controller",
  "executive": false,
  "human": false
 },
 {
  "id": "payables",
  "name": "Renata Soto",
  "role": "AI A/P Preparation Analyst",
  "office": "finance",
  "reportsTo": "controller",
  "executive": false,
  "human": false
 },
 {
  "id": "reconciliation",
  "name": "Pablo Estrada",
  "role": "AI Reconciliation Preparation Analyst",
  "office": "finance",
  "reportsTo": "controller",
  "executive": false,
  "human": false
 },
 {
  "id": "clients-lead",
  "name": "Natalia Campos",
  "role": "AI Client Experience Lead",
  "office": "clients",
  "reportsTo": "operations-lead",
  "executive": false,
  "human": false
 },
 {
  "id": "support",
  "name": "Luis Eduardo Martín",
  "role": "AI Client Workflow Analyst",
  "office": "clients",
  "reportsTo": "clients-lead",
  "executive": false,
  "human": false
 },
 {
  "id": "risk",
  "name": "Javier Ibarra",
  "role": "AI Business Risk Analyst",
  "office": "risk",
  "reportsTo": "cfo",
  "executive": false,
  "human": false
 },
 {
  "id": "audit",
  "name": "Beatriz Delgado",
  "role": "AI Audit Evidence Reviewer",
  "office": "audit",
  "reportsTo": "ceo",
  "executive": false,
  "human": false
 }
];
export const offices=[['ceo','CEO Office'],['secretary','Executive Secretariat'],['operations','Operations'],['technology','Technology & Product'],['sales','Strategy, Sales & Marketing'],['clients','Client Experience'],['finance','Finance & Accounting'],['legal','Legal & Compliance'],['risk','Risk, Security & Privacy'],['people','AI Resources & Capacity'],['audit','Audit Evidence']];
export type Activity={agentId?:string;office:string;status:string};
export function supervisor(person:StaffProfile){return staff.find(p=>p.id===person.reportsTo);}
export function individualWorking(person:StaffProfile,runs:Activity[],fresh:boolean){return !person.human&&fresh&&runs.some(r=>r.agentId===person.id&&r.office===person.office&&r.status==='Working');}
