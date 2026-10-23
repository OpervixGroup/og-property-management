export const clientCampus = {
 name: 'OG OPERVIX GROUP · CORPORATE CLIENT CAMPUS',
 office: 'Devonshire Client',
 coordinator: 'Natalia · client coordination function',
 supervisor: 'Lucia · client supervision function',
 desks: [
  {id:'devonshire-leasing',name:'Devonshire Leasing Agency Inc.',kind:'Leasing office',departments:[
   {name:'Leasing & Resident Experience',workflow:'Receive a request → verify property, unit and authority → prepare the leasing response → review → record the outcome.',evidence:'Verified request, unit record, approved lease or resident correspondence.'},
   {name:'Accounting & Owner Reporting',workflow:'Match original source to the correct company and period → reconcile exceptions → prepare an approval packet → verify approved records.',evidence:'Correct company/realm, period, original documents and reconciliation evidence. Client funds remain separate from Opervix revenue.'},
   {name:'Maintenance & Vendors',workflow:'Validate the unit and issue → check existing work orders → prepare vendor coordination → obtain required approval → verify completion.',evidence:'Original request, duplicate check, approved scope and actual completion documentation.'},
   {name:'Operations & Compliance',workflow:'Check the client calendar and task register → assign the appropriate department → review privacy and authority → consolidate verified outcomes.',evidence:'Verified tenant identity, calendar, task owner, acceptance criteria and approval history.'}
  ]},
  {id:'devonshire-hoa',name:'Devonshire Homeowner Association',kind:'HOA office',departments:[
   {name:'Homeowner & Board Services',workflow:'Receive the homeowner or board request → verify authority and association → prepare the response or board packet → review → record the decision.',evidence:'Verified association identity, authorized request and relevant approved governing documents.'},
   {name:'Association Accounting',workflow:'Verify the association company and accounting period → match source documents → identify exceptions → prepare a reviewed reconciliation packet.',evidence:'Verified HOA company/realm and original association records. Do not reuse the leasing company connection without identity verification.'},
   {name:'Community Maintenance & Vendors',workflow:'Confirm common-area responsibility → check existing requests → prepare the scope and vendor review → obtain approval → verify actual completion.',evidence:'Association responsibility, original request, approved scope and completion evidence.'},
   {name:'Governance & Records',workflow:'Verify document version and permitted access → prepare a source-backed summary → route for authorized review → preserve the decision and evidence.',evidence:'Approved governing records, source version, authorized reviewer and protected association storage.'}
  ]}
 ]
} as const;
export const learningSteps = [
 ['Observe','Read an authorized source inside the correct client workspace.'],
 ['Compare','Compare the source with the existing department procedure and prior exceptions.'],
 ['Review','Record a proposed lesson with source, date, department, reviewer and acceptance criteria.'],
 ['Approve','A reviewer accepts or rejects the proposed procedure change.'],
 ['Retain','Save accepted knowledge and its history in that client’s protected workspace.']
] as const;
