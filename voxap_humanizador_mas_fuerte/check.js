
    if (window.pdfjsLib) { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null, isRecording = false, currentMode = 'summary', currentInputMode = 'short', currentFile = null;
    const inputText = document.getElementById('inputText'), resultBox = document.getElementById('resultBox'), statusText = document.getElementById('statusText'), supportTag = document.getElementById('supportTag'), modeTag = document.getElementById('modeTag'), outputSelect = document.getElementById('outputSelect'), optionButtons = document.querySelectorAll('.option'), inputModeButtons = document.querySelectorAll('[data-input-mode]'), inputSizeTag = document.getElementById('inputSizeTag'), modeHelpText = document.getElementById('modeHelpText'), inputLabel = document.getElementById('inputLabel'), uploadZone = document.getElementById('uploadZone'), fileInput = document.getElementById('fileInput'), fileInfo = document.getElementById('fileInfo'), fileNameEl = document.getElementById('fileName'), fileSubEl = document.getElementById('fileSub'), removeFileBtn = document.getElementById('removeFileBtn');
    function setStatus(message, type=''){ statusText.textContent = message; statusText.className = 'status'; if(type) statusText.classList.add(type); }
    function updateModeTag(){ const labels={summary:'resumen',humanizer:'humanizador',aidetector:'detector IA',tasks:'tareas',reply:'respuesta sugerida'}; modeTag.textContent = `Modo: ${labels[currentMode]}`; }
    function formatFileSize(bytes){ if(bytes<1024) return `${bytes} B`; if(bytes<1024*1024) return `${Math.round(bytes/102.4)/10} KB`; return `${Math.round(bytes/104857.6)/10} MB`; }
    function getFileExt(name){ const parts=name.toLowerCase().split('.'); return parts.length>1 ? parts.pop() : ''; }
    function getFileTypeName(ext){ const map={txt:'Texto',md:'Markdown',csv:'CSV',json:'JSON',html:'HTML',htm:'HTML',pdf:'PDF',docx:'Word',xlsx:'Excel',xls:'Excel'}; return map[ext] || ext.toUpperCase() || 'Archivo'; }
    function showFileInfo(file){ currentFile=file; const ext=getFileExt(file.name); fileNameEl.textContent=file.name; fileSubEl.textContent=`${getFileTypeName(ext)} · ${formatFileSize(file.size)}`; fileInfo.classList.add('visible'); uploadZone.classList.add('file-loaded'); }
    function clearFileInfo(){ currentFile=null; fileInfo.classList.remove('visible'); uploadZone.classList.remove('file-loaded'); fileNameEl.textContent=''; fileSubEl.textContent=''; fileInput.value=''; }
    function splitSentences(text){ return text.replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean); }
    function summarizeText(text){ const sentences=splitSentences(text); if(sentences.length<=2) return text.trim()||'No hay texto para procesar.'; const keywords=['importante','urgente','reunión','presupuesto','enviar','hacer','recordar','mañana','hoy','jueves','viernes','antes']; const scored=sentences.map(sentence=>{ const lower=sentence.toLowerCase(); let score=Math.min(sentence.length/40,3); keywords.forEach(word=>{ if(lower.includes(word)) score+=2; }); return {sentence,score};}); return scored.sort((a,b)=>b.score-a.score).slice(0,2).map(x=>x.sentence.trim()).join(' '); }
    function extractTasks(text){ const sentences=splitSentences(text); const triggers=['tengo que','hay que','debo','debes','hacer','enviar','revisar','llamar','confirmar','preparar','terminar','entregar','recordar','pasar','mandar','hablar','comprar']; const tasks=[]; sentences.forEach(sentence=>{ const lower=sentence.toLowerCase(); if(triggers.some(tg=>lower.includes(tg))) tasks.push(sentence.trim().replace(/^[-•\s]+/,'')); }); if(!tasks.length) return '• Revisar este mensaje y convertirlo en acciones concretas.\n• Confirmar los próximos pasos con la otra persona.\n• Guardar el resumen principal a mano.'; return tasks.map(task=>'• '+task).join('\n'); }
    function suggestReply(text){ const summary=summarizeText(text); return `Perfecto, lo tengo. Resumo lo importante: ${summary} Me pongo con ello y te confirmo en cuanto lo tenga listo.`; }
    function sentenceCase(text){ return text ? text.charAt(0).toUpperCase()+text.slice(1) : text; }
    function normalizeHumanText(text){ return text
      .replace(/[ \t]+/g,' ')
      .replace(/\s*([,.;:!?])\s*/g,'$1 ')
      .replace(/\s+/g,' ')
      .replace(/\b(que|de|la|el|y) \1\b/gi,'$1')
      .replace(/ ,/g,',')
      .trim(); }
    function humanizeSentence(sentence){
      let s=normalizeHumanText(sentence);
      const swaps=[
        [/\bte informo de que\b/gi,'te comento que'],
        [/\bnecesito que\b/gi,'me gustaría que'],
        [/\bprocedo a\b/gi,'voy a'],
        [/\bse procederá a\b/gi,'se va a'],
        [/\bcon el objetivo de\b/gi,'para'],
        [/\ba fin de que\b/gi,'para que'],
        [/\ben este sentido\b/gi,'aquí'],
        [/\bpor consiguiente\b/gi,'así que'],
        [/\bpor ende\b/gi,'así que'],
        [/\bpor lo tanto\b/gi,'así que'],
        [/\bpor otra parte\b/gi,'además'],
        [/\bcabe destacar que\b/gi,'conviene tener en cuenta que'],
        [/\bse llevará a cabo\b/gi,'se hará'],
        [/\bse ha procedido a\b/gi,'se ha'],
        [/\bha sido realizado\b/gi,'se ha hecho'],
        [/\bha sido enviada\b/gi,'se ha enviado'],
        [/\bha sido enviado\b/gi,'se ha enviado'],
        [/\bde manera inmediata\b/gi,'cuanto antes'],
        [/\blo antes posible\b/gi,'cuanto antes'],
        [/\bcon respecto a\b/gi,'sobre'],
        [/\bpor medio de la presente\b/gi,'con este mensaje'],
        [/\bsolicito que\b/gi,'te pido que'],
        [/\bagradecería que\b/gi,'me gustaría que'],
        [/\bme dirijo a usted\b/gi,'te escribo'],
        [/\ble comunico que\b/gi,'te digo que'],
        [/\bcon la mayor brevedad posible\b/gi,'cuanto antes'],
        [/\ben la actualidad\b/gi,'ahora mismo'],
        [/\bresulta fundamental\b/gi,'es clave'],
        [/\bresulta importante\b/gi,'es importante'],
        [/\bhacer uso de\b/gi,'usar'],
        [/\bllevar a cabo\b/gi,'hacer'],
        [/\bbrindar\b/gi,'dar'],
        [/\bproporcionar\b/gi,'dar'],
        [/\bse puede observar que\b/gi,'se ve que'],
        [/\bse puede apreciar que\b/gi,'se ve que'],
        [/\bde igual manera\b/gi,'igual'],
        [/\ben definitiva\b/gi,'en resumen'],
        [/\ben conclusión\b/gi,'en resumen'],
        [/\bpor otro lado\b/gi,'además'],
        [/\bde este modo\b/gi,'así'],
        [/\ba través de\b/gi,'con'],
        [/\bdebido a que\b/gi,'porque']
      ];
      swaps.forEach(([pattern,replacement])=>{ s=s.replace(pattern,replacement); });
      s=s.replace(/^\s*hola[,:\-]?\s*/i,'Hola, ');
      s=s.replace(/^\s*buenas[,:\-]?\s*/i,'Buenas, ');
      s=s.replace(/\b(?:muy )?importante mencionar que\b/gi,'merece la pena decir que');
      s=s.replace(/\bse encuentra\b/gi,'está');
      s=s.replace(/\bse requieren\b/gi,'hacen falta');
      s=s.replace(/\bse requiere\b/gi,'hace falta');
      s=s.replace(/\bpuede ser observado\b/gi,'se puede ver');
      s=s.replace(/\bcon el fin de\b/gi,'para');
      s=s.replace(/\bde conformidad con\b/gi,'según');
      s=s.replace(/\bno obstante\b/gi,'aun así');
      s=s.replace(/\bsin embargo\b/gi,'pero');
      s=s.replace(/\bademás, además\b/gi,'además');
      s=s.replace(/\bpor favor\b/gi,'por favor');
      s=s.replace(/\s+,/g,',').replace(/,+/g,',');
      s=s.replace(/\s+\./g,'.').replace(/\s+!/g,'!').replace(/\s+\?/g,'?');
      s=s.replace(/, (?=(y|pero|así que|aunque)\b)/gi,'. ');
      s=s.replace(/;\s*/g,'. ');
      s=s.replace(/:\s*/g,': ');
      s=s.trim();
      s=sentenceCase(s);
      if(!/[.!?]$/.test(s)) s+='.';
      return s;
    }
    function humanizeText(text){
      const clean=text.trim();
      if(!clean) return 'No hay texto para procesar.';
      const paragraphs=clean.split(/\n{2,}/).map(p=>p.trim()).filter(Boolean);
      const humanizedParagraphs=paragraphs.map(paragraph=>{
        const rawSentences=paragraph
          .replace(/\n+/g,' ')
          .split(/(?<=[.!?])\s+/)
          .map(s=>s.trim())
          .filter(Boolean);
        const sentences=(rawSentences.length ? rawSentences : [paragraph]).map(humanizeSentence);
        return sentences.join(' ')
          .replace(/\b(yo yo|que que|de de|la la|el el)\b/gi,match=>match.split(' ')[0])
          .replace(/\s+/g,' ')
          .trim();
      });
      let output=humanizedParagraphs.join('\n\n');
      output=output
        .replace(/\b(es clave|es importante) destacar que\b/gi,'conviene tener en cuenta que')
        .replace(/\bconviene tener en cuenta que que\b/gi,'conviene tener en cuenta que')
        .replace(/\bme gustaría que me envíes\b/gi,'me gustaría que me enviaras')
        .replace(/\bme gustaría que me mandes\b/gi,'me gustaría que me mandaras')
        .replace(/\bte digo que\b/gi,'te comento que')
        .replace(/\bpara poder\b/gi,'para')
        .replace(/\bcon el objetivo de poder\b/gi,'para')
        .replace(/\. ([a-záéíóúñ])/g,(m,p1)=>'. '+p1.toUpperCase())
        .replace(/, (?=(además|también|pero|así que|aunque)\b)/gi,'. ')
        .replace(/\s+\n/g,'\n')
        .replace(/\n\s+/g,'\n')
        .trim();
      return output;
    }
    function escapeHtml(str){ return str.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
    function analyzeAIText(text){ const clean=text.trim(); if(!clean) return null; const words=clean.split(/\s+/).filter(Boolean); const sentences=splitSentences(clean); const lower=clean.toLowerCase(); let score=18; const signals=[]; const longWords=words.filter(w=>w.replace(/[^\p{L}]/gu,'').length>=8).length; const uniqueRatio=words.length ? new Set(words.map(w=>w.toLowerCase())).size/words.length : 0; const connectors=['además','sin embargo','por tanto','en conclusión','en definitiva','cabe destacar','por otro lado','en este sentido','por consiguiente','por ende']; const connectorHits=connectors.filter(c=>lower.includes(c)).length; const repeatedPhrases=(lower.match(/\b(en este sentido|por otro lado|además|en definitiva)\b/g)||[]).length; const avgSentenceLen=sentences.length ? words.length/sentences.length : words.length; const commaDensity=(clean.match(/,/g)||[]).length/Math.max(sentences.length,1); const exclamations=(clean.match(/[!?¡¿]/g)||[]).length; const firstPerson=(lower.match(/\b(yo|me|mi|mío|mía|nosotros|nosotras|creo|pienso|siento)\b/g)||[]).length; const fillers=(lower.match(/\b(eh|mmm|bueno|vale|o sea|pues)\b/g)||[]).length; const lineBreaks=(clean.match(/\n/g)||[]).length; if(avgSentenceLen>22){ score+=16; signals.push('Frases largas y muy compactas.'); } if(connectorHits>=2){ score+=14; signals.push('Uso abundante de conectores muy formales.'); } if(repeatedPhrases>=2){ score+=10; signals.push('Repite estructuras típicas de redacción automatizada.'); } if(uniqueRatio<0.58 && words.length>40){ score+=12; signals.push('Poca variedad léxica para la longitud del texto.'); } if(commaDensity>2.2){ score+=8; signals.push('Demasiadas pausas internas por frase.'); } if(longWords/Math.max(words.length,1)>0.22){ score+=8; signals.push('Vocabulario denso y excesivamente uniforme.'); } if(exclamations===0 && firstPerson===0 && words.length>35){ score+=7; signals.push('Tono impersonal y muy plano.'); } if(fillers>1 || exclamations>2 || firstPerson>1){ score-=12; signals.push('Aparecen rasgos más espontáneos y humanos.'); } if(lineBreaks>2){ score-=6; signals.push('La estructura es más irregular y menos artificial.'); } if(avgSentenceLen<10){ score-=8; signals.push('Frases cortas y más naturales.'); } if(words.length<18){ score=Math.max(score-10,6); signals.push('Texto demasiado corto para estimar con precisión.'); } score=Math.max(1,Math.min(99,Math.round(score))); let verdict='Baja probabilidad orientativa de IA'; if(score>=70) verdict='Probabilidad orientativa alta de IA'; else if(score>=40) verdict='Probabilidad orientativa media de IA'; if(!signals.length) signals.push('No hay señales claras; el texto es ambiguo.'); return {score,verdict,words:words.length,sentences:sentences.length || (clean ? 1 : 0),avgSentenceLen:Math.round(avgSentenceLen || 0),signals:signals.slice(0,4)}; }
    function renderAIDetector(text){ const analysis=analyzeAIText(text); if(!analysis){ resultBox.classList.remove('ai-box'); resultBox.textContent='Aquí aparecerá el resultado procesado.'; return; } resultBox.classList.add('ai-box'); const scoreClass=analysis.score>=70 ? 'Alta' : analysis.score>=40 ? 'Media' : 'Baja'; resultBox.innerHTML=`<div class="ai-panel"><div class="ai-top"><div><div class="ai-label">Estimación orientativa</div><div class="ai-score-wrap"><div class="ai-score">${analysis.score}<small>%</small></div><div class="ai-badge">${scoreClass}</div></div></div><div class="ai-badge">${escapeHtml(analysis.verdict)}</div></div><div class="ai-meter"><div class="ai-meter-fill" style="width:${analysis.score}%"></div><div class="ai-meter-glow"></div></div><div class="ai-meta"><div class="ai-stat"><strong>${analysis.words}</strong><span>palabras analizadas</span></div><div class="ai-stat"><strong>${analysis.sentences}</strong><span>frases detectadas</span></div><div class="ai-stat"><strong>${analysis.avgSentenceLen}</strong><span>palabras por frase</span></div></div><div class="ai-signals"><h4>Señales detectadas</h4><ul>${analysis.signals.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div class="ai-note"><h4>Ojo</h4><p><strong>Esto es solo una estimación visual y orientativa.</strong> No demuestra si un texto es de IA o de una persona. Sirve para dar pistas de estilo, no para emitir un veredicto serio.</p></div></div>`; }
    function processText(text,mode){ const clean=text.trim(); if(!clean) return 'No hay texto para procesar.'; if(mode==='humanizer') return humanizeText(clean); if(mode==='aidetector') return clean; if(mode==='summary') return summarizeText(clean); if(mode==='tasks') return extractTasks(clean); if(mode==='reply') return suggestReply(clean); return clean; }
    function renderResult(){ const clean=inputText.value.trim(); if(currentMode==='aidetector'){ renderAIDetector(clean); } else { resultBox.classList.remove('ai-box'); resultBox.textContent = clean ? processText(clean,currentMode) : 'Aquí aparecerá el resultado procesado.'; } updateModeTag(); }
    function setMode(mode){ currentMode=mode; outputSelect.value=mode; optionButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode)); renderResult(); }
    function setInputMode(mode){ currentInputMode=mode; const isLong=mode==='long'; document.body.classList.toggle('mode-long',isLong); inputModeButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.inputMode===mode)); inputSizeTag.textContent=isLong?'Modo largo':'Modo corto'; inputLabel.textContent=isLong?'Texto largo detectado o pegado':'Texto detectado o pegado'; modeHelpText.textContent=isLong?'Este modo es para reuniones, clases, ideas largas o mensajes extensos. La herramienta se abre en horizontal y ocupa mucha más pantalla para que leer y editar no sea un castigo medieval.':'Usa este modo para notas rápidas, audios breves y mensajes que quieres resolver sin llenar la pantalla.'; inputText.placeholder=isLong?'Pega aquí un texto largo, una transcripción extensa o el contenido de una reunión completa para procesarlo con más espacio.':'Ejemplo: Marta confirmó la reunión del jueves, me pidió revisar el presupuesto y enviar la propuesta antes de las 18:00...'; }
    async function readPlainFile(file){ return await file.text(); }
    async function readPdfFile(file){ if(!window.pdfjsLib) throw new Error('PDF no disponible todavía.'); const buffer=await file.arrayBuffer(); const pdf=await pdfjsLib.getDocument({data:buffer}).promise; let text=''; for(let pageNum=1; pageNum<=pdf.numPages; pageNum++){ const page=await pdf.getPage(pageNum); const content=await page.getTextContent(); text += content.items.map(item=>item.str).join(' ') + '\n\n'; } return text.trim(); }
    async function readDocxFile(file){ if(!window.mammoth) throw new Error('Lector DOCX no disponible todavía.'); const buffer=await file.arrayBuffer(); const result=await window.mammoth.extractRawText({arrayBuffer:buffer}); return result.value.trim(); }
    async function readExcelFile(file){ if(!window.XLSX) throw new Error('Lector Excel no disponible todavía.'); const buffer=await file.arrayBuffer(); const workbook=XLSX.read(buffer,{type:'array'}); const sheets=workbook.SheetNames.map(name=>`# ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`); return sheets.join('\n\n').trim(); }
    async function readSupportedFile(file){ const name=file.name.toLowerCase(); if(name.endsWith('.txt')||name.endsWith('.md')||name.endsWith('.csv')||name.endsWith('.json')||name.endsWith('.html')||name.endsWith('.htm')) return await readPlainFile(file); if(name.endsWith('.pdf')) return await readPdfFile(file); if(name.endsWith('.docx')) return await readDocxFile(file); if(name.endsWith('.xlsx')||name.endsWith('.xls')) return await readExcelFile(file); throw new Error('Archivo no compatible. Sube un TXT, CSV, JSON, HTML, PDF, DOCX o Excel.'); }
    async function handleFile(file){ if(!file) return; try{ setStatus(`Leyendo ${file.name}...`,'warn'); const extractedText=await readSupportedFile(file); if(!extractedText || !extractedText.trim()) throw new Error('No se pudo extraer texto útil del archivo.'); inputText.value=extractedText.trim(); showFileInfo(file); renderResult(); setStatus(`Archivo cargado: ${file.name}`,'ok'); }catch(error){ clearFileInfo(); setStatus(error.message || 'No se pudo procesar ese archivo.','err'); } }
    uploadZone.addEventListener('click',()=>fileInput.click()); uploadZone.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); }});
    fileInput.addEventListener('change',async (e)=>{ const file=e.target.files && e.target.files[0]; await handleFile(file); fileInput.value=''; });
    removeFileBtn.addEventListener('click',(e)=>{ e.stopPropagation(); clearFileInfo(); inputText.value=''; renderResult(); setStatus('Archivo eliminado.','ok'); });
    ['dragenter','dragover'].forEach(eventName=>{ uploadZone.addEventListener(eventName,(e)=>{ e.preventDefault(); uploadZone.classList.add('dragover'); });});
    ['dragleave','drop'].forEach(eventName=>{ uploadZone.addEventListener(eventName,(e)=>{ e.preventDefault(); if(eventName==='drop'){ const file=e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; handleFile(file);} uploadZone.classList.remove('dragover'); });});
    optionButtons.forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode))); inputModeButtons.forEach(btn=>btn.addEventListener('click',()=>setInputMode(btn.dataset.inputMode))); outputSelect.addEventListener('change',(e)=>setMode(e.target.value)); inputText.addEventListener('input',renderResult);
    document.getElementById('sampleBtn').addEventListener('click',()=>{ inputText.value='Marta confirmó la reunión del jueves por la tarde. Me pidió revisar el presupuesto final y enviar la propuesta antes de las 18:00. También dijo que hay que confirmar asistencia y pasarle la versión actualizada del documento.'; renderResult(); setStatus('Ejemplo cargado.','ok'); });
    document.getElementById('clearBtn').addEventListener('click',()=>{ inputText.value=''; clearFileInfo(); renderResult(); setStatus('Contenido limpiado.','ok'); });
    document.getElementById('processBtn').addEventListener('click',()=>{ renderResult(); setStatus('Texto procesado.','ok'); });
    document.getElementById('copyBtn').addEventListener('click',async ()=>{ try{ await navigator.clipboard.writeText(resultBox.textContent); setStatus('Resultado copiado al portapapeles.','ok'); }catch(e){ setStatus('No se pudo copiar automáticamente. Copia manualmente.','warn'); }});
    if(SpeechRecognition){ supportTag.textContent='Micrófono compatible'; recognition=new SpeechRecognition(); recognition.continuous=true; recognition.interimResults=true; recognition.lang='es-ES'; let finalTranscript=''; recognition.onstart=()=>{ isRecording=true; setStatus('Escuchando... habla ahora.','ok'); }; recognition.onresult=(event)=>{ let interimTranscript=''; for(let i=event.resultIndex;i<event.results.length;i++){ const transcript=event.results[i][0].transcript; if(event.results[i].isFinal) finalTranscript+=transcript+' '; else interimTranscript+=transcript; } inputText.value=(finalTranscript+interimTranscript).trim(); renderResult(); }; recognition.onerror=(event)=>{ const map={'not-allowed':'Permiso de micrófono denegado.','no-speech':'No se detectó voz.','audio-capture':'No se encontró micrófono.','network':'Error de red del reconocimiento.'}; setStatus(map[event.error]||('Error: '+event.error),'err'); }; recognition.onend=()=>{ isRecording=false; setStatus('Grabación detenida.','warn'); }; document.getElementById('startBtn').addEventListener('click',()=>{ try{ recognition.lang='es-ES'; recognition.start(); finalTranscript=inputText.value ? inputText.value+' ' : ''; }catch(e){ setStatus('No se pudo iniciar el micrófono.','err'); }}); document.getElementById('stopBtn').addEventListener('click',()=>{ if(isRecording) recognition.stop(); }); } else { supportTag.textContent='Micrófono no compatible'; setStatus('Tu navegador no soporta reconocimiento de voz. Puedes pegar texto y probar la lógica igualmente.','warn'); document.getElementById('startBtn').disabled=true; document.getElementById('stopBtn').disabled=true; document.getElementById('startBtn').style.opacity='.5'; document.getElementById('stopBtn').style.opacity='.5'; document.getElementById('startBtn').style.cursor='not-allowed'; document.getElementById('stopBtn').style.cursor='not-allowed'; }
    setInputMode('short'); renderResult();
  