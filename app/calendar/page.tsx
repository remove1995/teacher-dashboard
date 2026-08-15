import Link from "next/link";
import { CalendarWorkspace, type CalendarEvent } from "@/components/calendar-workspace";
import { filterCalendarEvents, monthRange, shiftCalendarFocus, weekRange, type CalendarKind, type CalendarView } from "@/lib/domain/calendar";
import { todayDate } from "@/lib/domain/dates";
import { prisma } from "@/lib/db/prisma";
import { getTeacherSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
type Search={view?:string;date?:string;kind?:string;lesson?:string;add?:string};
const kinds={ALL:"Все",INDIVIDUAL:"Индивидуальные",PAIR:"Пары",GROUP:"Группы"} as const;
const iso=(date:Date)=>date.toISOString().slice(0,10);

export default async function CalendarPage({searchParams}:{searchParams:Promise<Search>}){
  const [search,settings]=await Promise.all([searchParams,getTeacherSettings()]); const today=todayDate(settings.timezone);
  const focus=/^\d{4}-\d{2}-\d{2}$/.test(search.date??"")?search.date!:today;
  const view:CalendarView=search.view==="month"?"month":"week";
  const kind=Object.hasOwn(kinds,search.kind??"")?search.kind as keyof typeof kinds:"ALL";
  const week=weekRange(focus),month=monthRange(focus);
  const queryStart=view==="week"?week.start:month.gridStart,queryEnd=view==="week"?week.end:month.gridEnd;
  const [lessons,selectedLesson,students,cohorts]=await Promise.all([
    prisma.lesson.findMany({where:{scheduledDate:{gte:queryStart,lte:queryEnd}},orderBy:[{scheduledDate:"asc"},{startMinute:"asc"}],include:{student:true,cohort:true,replacementLesson:{select:{id:true}}}}),
    search.lesson?prisma.lesson.findUnique({where:{id:search.lesson},include:{student:true,cohort:true,replacementLesson:{select:{id:true}}}}):null,
    prisma.student.findMany({where:{status:{not:"COMPLETED"},billingProfiles:{some:{cohortId:null,effectiveFrom:{lte:new Date(`${today}T23:59:59Z`)},OR:[{effectiveTo:null},{effectiveTo:{gte:new Date(`${today}T00:00:00Z`)}}]}}},orderBy:{name:"asc"},select:{id:true,name:true}}),
    prisma.cohort.findMany({where:{activeFrom:{lte:new Date(`${today}T00:00:00Z`)},OR:[{activeTo:null},{activeTo:{gte:new Date(`${today}T00:00:00Z`)}}]},orderBy:{name:"asc"},select:{id:true,name:true,kind:true}}),
  ]);
  const mapEvent=(lesson:typeof lessons[number]):CalendarEvent=>({id:lesson.id,date:iso(lesson.scheduledDate),startMinute:lesson.startMinute,durationMinutes:lesson.durationMinutes,title:lesson.title,status:lesson.status,kind:lesson.student?"INDIVIDUAL":lesson.cohort!.kind,entityName:(lesson.student??lesson.cohort)!.name,color:lesson.colorOverride??(lesson.student??lesson.cohort)!.color,studentId:lesson.studentId,cohortId:lesson.cohortId,recurringScheduleId:lesson.recurringScheduleId,originalLessonId:lesson.originalLessonId,replacementLessonId:lesson.replacementLesson?.id??null,manuallyEdited:lesson.manuallyEdited});
  const events=filterCalendarEvents(lessons.map(mapEvent),kind as "ALL"|CalendarKind);
  const selected=selectedLesson?mapEvent(selectedLesson as typeof lessons[number]):undefined;
  const days=view==="week"?week.days.map(iso):Array.from({length:Math.round((month.gridEnd.getTime()-month.gridStart.getTime())/86400000)+1},(_,index)=>{const date=new Date(month.gridStart);date.setUTCDate(date.getUTCDate()+index);return iso(date)});
  const href=(next:Partial<Search>)=>`?${new URLSearchParams(Object.entries({view,date:focus,kind,...next}).filter(([,value])=>value) as [string,string][]).toString()}`;
  const prev=shiftCalendarFocus(focus,view,-1),next=shiftCalendarFocus(focus,view,1);
  const periodLabel=view==="week"?`${new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",timeZone:"UTC"}).format(week.start)} — ${new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(week.end)}`:new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric",timeZone:"UTC"}).format(month.start);
  const targets=[...students.map(student=>({value:`student:${student.id}`,name:student.name,kind:"INDIVIDUAL" as const})),...cohorts.map(cohort=>({value:`cohort:${cohort.id}`,name:cohort.name,kind:cohort.kind}))];
  return <div className="page-stack global-calendar"><header className="page-heading calendar-heading"><h1>Календарь</h1><div className="wrap-actions"><Link className="secondary-button" href={href({add:"1"})}>+ Добавить урок</Link></div></header>
    <section className="calendar-toolbar"><div className="calendar-navigation"><Link href={href({date:prev})}>‹</Link><Link className="calendar-today" href={`?view=${view}&date=${today}&kind=${kind}`}>Сегодня</Link><Link href={href({date:next})}>›</Link><strong>{periodLabel}</strong></div><nav className="calendar-view-toggle"><Link className={view==="week"?"active":""} href={href({view:"week"})}>Неделя</Link><Link className={view==="month"?"active":""} href={href({view:"month"})}>Месяц</Link></nav></section>
    <nav className="calendar-filters">{Object.entries(kinds).map(([value,label])=><Link className={kind===value?"active":""} href={href({kind:value})} key={value}>{label}</Link>)}</nav>
    <CalendarWorkspace key={`${view}:${focus}:${kind}`} events={events} days={days} view={view} focus={focus} today={today} selected={selected} addOpen={search.add==="1"} targets={targets} baseQuery={`view=week&kind=${kind}`} defaultLessonDuration={settings.defaultLessonDuration}/>
  </div>;
}
