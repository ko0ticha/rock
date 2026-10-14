// Изображения создаются локально: данные дневника не отправляются на сервер.
const shareType=$('#shareType'),shareSubject=$('#shareSubject'),shareGrade=$('#shareGrade');
const shareRequiresSubject=new Set(['subjectGrades','oneGrade','subjectBars','subjectCurve']);
const shareColors={background:'#f7f3ff',ink:'#292238',muted:'#766c84',purple:'#6750a4',lavender:'#efe8ff',line:'#e6ddf1',white:'#ffffff'};

function updateShareOptions(){
  const type=shareType.value,subjectId=shareSubject.value,gradeId=shareGrade.value;
  shareSubject.innerHTML=state.subjects.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
  if(state.subjects.some(s=>s.id===subjectId))shareSubject.value=subjectId;
  const subject=state.subjects.find(s=>s.id===shareSubject.value);
  const grades=(subject?.grades||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  shareGrade.innerHTML=grades.map(g=>`<option value="${escapeHtml(g.id)}">${g.value} · ${formatDate(g.date)}${g.note?' · '+escapeHtml(g.note):''}</option>`).join('');
  if(grades.some(g=>g.id===gradeId))shareGrade.value=gradeId;
  $('#shareSubjectField').hidden=!shareRequiresSubject.has(type);
  $('#shareGradeField').hidden=type!=='oneGrade';
  const hasData=shareRequiresSubject.has(type)?!!grades.length:allGrades().length>0;
  $('#shareHint').textContent=hasData?'Будет сохранена картинка PNG. Данные останутся на этом устройстве.':'Нет оценок для выбранного варианта. Добавьте оценку или выберите другой предмет.';
  $('#downloadShareBtn').disabled=!hasData;
}

function shareRoundRect(ctx,x,y,w,h,r,color){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}

function shareText(ctx,text,x,y,maxWidth){
  text=String(text);
  if(ctx.measureText(text).width>maxWidth){while(text.length&&ctx.measureText(text+'…').width>maxWidth)text=text.slice(0,-1);text+='…'}
  ctx.fillText(text,x,y);
}

function shareCanvas(height,title,subtitle){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Этот браузер не поддерживает создание PNG.');
  ctx.fillStyle=shareColors.background;ctx.fillRect(0,0,1200,height);
  const gradient=ctx.createLinearGradient(0,0,1200,280);gradient.addColorStop(0,'#503686');gradient.addColorStop(1,'#8564c6');
  shareRoundRect(ctx,36,36,1128,260,34,gradient);
  ctx.fillStyle='#ffffffb0';ctx.font='700 22px system-ui, sans-serif';ctx.fillText('МОЙ СРЕДНИЙ БАЛЛ  /  РЕЗУЛЬТАТЫ',80,96);
  ctx.fillStyle=shareColors.white;ctx.font='700 50px system-ui, sans-serif';shareText(ctx,title,80,168,1035);
  ctx.font='25px system-ui, sans-serif';shareText(ctx,subtitle,80,228,1035);
  ctx.fillStyle=shareColors.muted;ctx.font='22px system-ui, sans-serif';ctx.fillText(`Создано ${new Date().toLocaleDateString('ru-RU')}`,80,height-43);
  return {canvas,ctx};
}

function shareCard(ctx,y,height){shareRoundRect(ctx,36,y,1128,height,28,shareColors.white)}

function shareHeader(ctx,label,value){
  ctx.fillStyle=shareColors.muted;ctx.font='24px system-ui, sans-serif';ctx.fillText(label,82,366);
  ctx.fillStyle=shareColors.purple;ctx.font='700 46px system-ui, sans-serif';shareText(ctx,value,82,430,1000);
}

function paintSubjectGrades(subject,grades){
  const rows=Math.ceil(grades.length/4),height=545+rows*125;
  if(height>12000)throw new Error('Слишком много оценок для одной картинки.');
  const {canvas,ctx}=shareCanvas(height,'Оценки по предмету',subject.name);
  shareCard(ctx,324,height-365);
  shareHeader(ctx,`${grades.length} ${plural(grades.length,['оценка','оценки','оценок'])} · средний балл`,fmt(average(grades)));
  grades.slice().sort((a,b)=>b.date.localeCompare(a.date)).forEach((g,i)=>{
    const x=80+(i%4)*263,y=465+Math.floor(i/4)*125;
    shareRoundRect(ctx,x,y,245,106,17,shareColors.lavender);
    ctx.fillStyle=shareColors.purple;ctx.font='700 47px system-ui, sans-serif';ctx.fillText(String(g.value),x+16,y+53);
    ctx.fillStyle=shareColors.ink;ctx.font='21px system-ui, sans-serif';ctx.fillText(formatDate(g.date),x+75,y+39);
    ctx.fillStyle=shareColors.muted;ctx.font='17px system-ui, sans-serif';shareText(ctx,`${g.classNumber} кл. · ${g.period}`,x+75,y+68,158);
    if(g.note){ctx.font='16px system-ui, sans-serif';shareText(ctx,g.note,x+16,y+95,212)}
  });
  ctx.fillStyle=shareColors.muted;ctx.font='22px system-ui, sans-serif';ctx.fillText(`Цель по предмету: ${subject.target}`,82,height-95);
  return canvas;
}

function paintOneGrade(subject,grade){
  const {canvas,ctx}=shareCanvas(820,'Моя оценка',subject.name);
  shareCard(ctx,325,395);
  shareRoundRect(ctx,83,370,250,280,28,shareColors.lavender);
  ctx.fillStyle=shareColors.purple;ctx.font='700 190px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(String(grade.value),208,578);ctx.textAlign='start';
  ctx.fillStyle=shareColors.muted;ctx.font='24px system-ui, sans-serif';ctx.fillText('Дата',380,411);ctx.fillText('Класс и период',380,497);
  ctx.fillStyle=shareColors.ink;ctx.font='700 34px system-ui, sans-serif';ctx.fillText(new Date(grade.date+'T12:00:00').toLocaleDateString('ru-RU'),380,452);
  ctx.font='30px system-ui, sans-serif';shareText(ctx,`${grade.classNumber} кл. · ${grade.period}`,380,539,690);
  if(grade.note){ctx.fillStyle=shareColors.muted;ctx.font='24px system-ui, sans-serif';ctx.fillText('Комментарий',380,600);ctx.fillStyle=shareColors.ink;ctx.font='25px system-ui, sans-serif';shareText(ctx,grade.note,380,640,700)}
  return canvas;
}

function paintBars(subject,grades){
  const single=!!subject;
  const items=single?[2,3,4,5].map(value=>({name:`Оценка ${value}`,value:grades.filter(g=>g.value===value).length})):
    state.subjects.map(s=>({name:s.name,value:average(grades.filter(g=>g.subjectId===s.id))}));
  const height=Math.max(850,560+items.length*66);
  const {canvas,ctx}=shareCanvas(height,single?'Диаграмма оценок':'Средний по предметам',single?subject.name:'Все предметы');
  shareCard(ctx,325,height-365);
  shareHeader(ctx,single?'Средний балл':`${items.length} ${plural(items.length,['предмет','предмета','предметов'])} · общий средний`,fmt(average(grades)));
  const max=single?Math.max(1,...items.map(i=>i.value)):5;
  items.forEach((item,i)=>{
    const y=535+i*66;
    ctx.fillStyle=shareColors.ink;ctx.font='21px system-ui, sans-serif';shareText(ctx,item.name,82,y,250);
    shareRoundRect(ctx,350,y-20,625,24,12,shareColors.lavender);
    if(item.value)shareRoundRect(ctx,350,y-20,625*item.value/max,24,12,shareColors.purple);
    ctx.fillStyle=shareColors.purple;ctx.font='700 24px system-ui, sans-serif';ctx.fillText(single?String(item.value):item.value?fmt(item.value):'—',1000,y+2);
  });
  ctx.fillStyle=shareColors.muted;ctx.font='20px system-ui, sans-serif';ctx.fillText(single?'Количество оценок каждого номинала':'Средний балл каждого предмета (максимум 5)',82,height-145);
  return canvas;
}

function paintCurve(subject,grades){
  const {canvas,ctx}=shareCanvas(950,'Динамика оценок',subject?subject.name:'Все предметы');
  shareCard(ctx,325,525);
  shareHeader(ctx,`${grades.length} ${plural(grades.length,['оценка','оценки','оценок'])} · средний балл`,fmt(average(grades)));
  const sorted=grades.slice().sort((a,b)=>a.date.localeCompare(b.date)),left=138,right=1095,top=505,bottom=730;
  for(let value=2;value<=5;value++){
    const y=bottom-(value-2)*(bottom-top)/3;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.strokeStyle=shareColors.line;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=shareColors.muted;ctx.font='21px system-ui, sans-serif';ctx.fillText(String(value),93,y+7);
  }
  ctx.beginPath();sorted.forEach((g,i)=>{const x=left+(sorted.length===1?(right-left)/2:i*(right-left)/(sorted.length-1)),y=bottom-(g.value-2)*(bottom-top)/3;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});
  ctx.strokeStyle=shareColors.purple;ctx.lineWidth=6;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  // Для длинной истории оставляем линию без перекрывающих её сотен точек.
  if(sorted.length<=45)sorted.forEach((g,i)=>{const x=left+(sorted.length===1?(right-left)/2:i*(right-left)/(sorted.length-1)),y=bottom-(g.value-2)*(bottom-top)/3;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=shareColors.white;ctx.fill();ctx.strokeStyle=shareColors.purple;ctx.lineWidth=3;ctx.stroke()});
  ctx.fillStyle=shareColors.muted;ctx.font='21px system-ui, sans-serif';ctx.fillText(formatDate(sorted[0].date),left,790);ctx.textAlign='right';ctx.fillText(formatDate(sorted[sorted.length-1].date),right,790);ctx.textAlign='start';
  return canvas;
}

function createShareImage(){
  const type=shareType.value,subject=state.subjects.find(s=>s.id===shareSubject.value);
  const grades=allGrades().filter(g=>!shareRequiresSubject.has(type)||g.subjectId===subject?.id);
  if(!grades.length)throw new Error('Для картинки нужны оценки.');
  if(type==='subjectGrades')return paintSubjectGrades(subject,grades);
  if(type==='oneGrade'){
    const grade=grades.find(g=>g.id===shareGrade.value);
    if(!grade)throw new Error('Выберите оценку.');
    return paintOneGrade(subject,grade);
  }
  if(type==='subjectBars'||type==='allBars')return paintBars(type==='subjectBars'?subject:null,grades);
  return paintCurve(type==='subjectCurve'?subject:null,grades);
}

$('#shareBtn').onclick=()=>{
  shareSubject.innerHTML=state.subjects.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('');
  if(state.subjects.some(s=>s.id===window.activeSubjectId))shareSubject.value=window.activeSubjectId;
  shareType.value=window.activeSubjectId?'subjectGrades':'allCurve';
  updateShareOptions();$('#shareDialog').showModal();
};
shareType.onchange=updateShareOptions;shareSubject.onchange=updateShareOptions;
$('#shareForm').onsubmit=e=>e.preventDefault();
$('#downloadShareBtn').onclick=()=>{
  try{
    const canvas=createShareImage();
    canvas.toBlob(blob=>{
      if(!blob){showToast('Не удалось создать PNG');return}
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`moi-ocenki-${shareType.value}-${new Date().toISOString().slice(0,10)}.png`;
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      $('#shareDialog').close();showToast('Картинка скачана');
    },'image/png');
  }catch(error){showToast(error.message||'Не удалось создать картинку')}
};