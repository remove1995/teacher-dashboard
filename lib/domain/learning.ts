export type LearningEntryType="VOCABULARY"|"GRAMMAR_FUNCTION"|"NOTE"|"TEST";
export type LearningEntry={id:string;type:LearningEntryType;date:string;title:string;content:string|null;note:string|null;score:number|null;maxScore:number|null;percentage:number|null;sourceLessonId:string|null;cohortId:string|null;contextName?:string|null;sourceLesson?:{date:string;title:string;entityKey:string}|null;attachments:Array<{fileName:string;externalUrl:string|null;mediaType:string|null}>};

export function createLearningEntry(input:LearningEntry){if(!input.title.trim()&&!input.content?.trim()&&!input.note?.trim())throw new Error("Learning entry needs a title or content");return{...input,title:input.title.trim(),content:input.content?.replace(/\r\n/g,"\n")??null,note:input.note?.replace(/\r\n/g,"\n")??null};}
export function editLearningEntry(entry:LearningEntry,changes:Partial<Pick<LearningEntry,"date"|"title"|"content"|"note"|"sourceLessonId"|"cohortId"|"attachments">>){return createLearningEntry({...entry,...changes});}
export function deleteLearningEntry(entries:LearningEntry[],id:string){return entries.filter(entry=>entry.id!==id);}
export function filterLearningEntries(entries:LearningEntry[],type:"ALL"|LearningEntryType){return type==="ALL"?entries:entries.filter(entry=>entry.type===type);}
export function searchLearningEntries(entries:LearningEntry[],query:string){const needle=query.trim().toLocaleLowerCase("ru-RU");if(!needle)return entries;return entries.filter(entry=>[entry.title,entry.content,entry.note].some(value=>value?.toLocaleLowerCase("ru-RU").includes(needle)));}
export function sortLearningEntries(entries:LearningEntry[]){return[...entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));}
export function testPercentage(score:number|null,maxScore:number|null){if(score===null||maxScore===null)return null;if(maxScore<=0||score<0)throw new Error("Invalid test score");return Math.round(score/maxScore*10000)/100;}
export function attachmentMetadata(fileName:string,externalUrl:string,mediaType:string|null=null){if(!fileName.trim()||!externalUrl.trim())throw new Error("Attachment name and URL are required");return{fileName:fileName.trim(),externalUrl:externalUrl.trim(),mediaType};}
export function scopedLearningAddType(tab:"ALL"|LearningEntryType){return tab==="ALL"?null:tab;}
export function contextFromSourceLesson(sourceLesson:{cohortId:string|null}|null,preserved:string|null=null){return sourceLesson?sourceLesson.cohortId:preserved;}
