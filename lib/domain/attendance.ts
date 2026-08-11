export type AttendanceStatus="PRESENT"|"ABSENT"|"RESCHEDULED"|"CANCELLED"|"PLANNED";
export type JournalFormat="INDIVIDUAL"|"PAIR"|"GROUP";
export type JournalParticipant={studentId:string;name:string;status:AttendanceStatus;manuallyEdited?:boolean};
export type JournalLesson={id:string;date:string;status:string;originalLessonId?:string|null;participants:JournalParticipant[]};
export type JournalRow={id:string;name:string;format:JournalFormat;lessons:JournalLesson[]};

export function displayedAttendanceStatus(lessonStatus:string,status:AttendanceStatus){if(lessonStatus==="RESCHEDULED")return "RESCHEDULED";if(lessonStatus==="CANCELLED")return "CANCELLED";if(lessonStatus==="PLANNED"&&status==="PLANNED")return "PLANNED";return status}
export function attendanceStatusMark(status:AttendanceStatus){return ({PRESENT:"✓",ABSENT:"×",RESCHEDULED:"→",CANCELLED:"–",PLANNED:"○"} as const)[status]}
export function lessonCountsInAttendanceTotal(lesson:Pick<JournalLesson,"status">){return lesson.status!=="PLANNED"&&lesson.status!=="RESCHEDULED"}
export function lessonAttendanceTotal(lesson:JournalLesson){if(!lessonCountsInAttendanceTotal(lesson))return{present:0,expected:0};return{present:lesson.participants.filter(({status})=>status==="PRESENT").length,expected:lesson.participants.length}}
export function monthlyAttendanceTotal(lessons:JournalLesson[]){return lessons.reduce((total,lesson)=>{const value=lessonAttendanceTotal(lesson);return{present:total.present+value.present,expected:total.expected+value.expected}},{present:0,expected:0})}
export function cohortAttendanceCell(lesson:JournalLesson){return lessonAttendanceTotal(lesson)}
export function individualAttendanceCell(lesson:JournalLesson){const participant=lesson.participants[0];return displayedAttendanceStatus(lesson.status,participant?.status??"PLANNED")}
export function journalDates(rows:JournalRow[]){return [...new Set(rows.flatMap(({lessons})=>lessons.map(({date})=>date)))].sort()}
export function filterAttendanceRows(rows:JournalRow[],filter:"ALL"|JournalFormat,query=""){const normalized=query.trim().toLocaleLowerCase("ru");return rows.filter(row=>(filter==="ALL"||row.format===filter)&&(!normalized||row.name.toLocaleLowerCase("ru").includes(normalized)))}
export function participantBreakdown(lesson:JournalLesson){return lesson.participants.map(participant=>({...participant,status:displayedAttendanceStatus(lesson.status,participant.status)}))}
export function correctParticipantAttendance(lesson:JournalLesson,studentId:string,status:AttendanceStatus){return{...lesson,participants:lesson.participants.map(participant=>participant.studentId===studentId?{...participant,status}:participant)}}

export type AttendanceRecordState={studentId:string;status:AttendanceStatus;manuallyEdited:boolean};
export function attendanceAfterLessonCompletion(expectedStudentIds:string[],records:AttendanceRecordState[]){const byStudent=new Map(records.map(record=>[record.studentId,record]));return [...new Set(expectedStudentIds)].map(studentId=>{const existing=byStudent.get(studentId);return existing?.manuallyEdited?existing:{studentId,status:"PRESENT" as const,manuallyEdited:false}})}
export function attendanceAfterUndoCompletion(records:AttendanceRecordState[]){return records.map(record=>record.manuallyEdited?record:record.status==="PRESENT"?{...record,status:"PLANNED" as const}:record)}
export function editableParticipantStatuses(lessonStatus:string):AttendanceStatus[]{return lessonStatus==="PLANNED"?["PLANNED","PRESENT","ABSENT","CANCELLED","RESCHEDULED"]:["PRESENT","ABSENT","CANCELLED","RESCHEDULED"]}
