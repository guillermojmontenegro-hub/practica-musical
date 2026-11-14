export function transcriptionErrors(entered,expected,{rhythm=false}={}) {
  const errors=new Set();
  entered.forEach((bar,index)=>{
    const target=expected[index]||[];
    if(bar.length!==target.length) errors.add('Cantidad de notas o ataques');
    bar.forEach((note,n)=>{
      const other=target[n];if(!other) return;
      if(note.pitch!==other.pitch) errors.add('Alturas de las notas');
      if(Math.abs(note.length-other.length)>1e-8) errors.add('Duración de las figuras');
      if(rhythm&&Boolean(note.tie)!==Boolean(other.tie)) errors.add('Ligaduras y síncopas');
      if(rhythm&&note.tuplet?.size!==other.tuplet?.size) errors.add('Grupos irregulares');
    });
  });
  return errors.size ? [...errors] : ['Transcripción diferente de la referencia'];
}
