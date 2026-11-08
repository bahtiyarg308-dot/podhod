/* ================= exercise library ================= */
const MUSCLES = { chest:'Грудь', back:'Спина', legs:'Ноги', glutes:'Ягодицы', shoulders:'Плечи', arms:'Руки', core:'Кор', cardio:'Кардио', stretch:'Растяжка' };
const EQUIP = { barbell:'штанга', dumbbell:'гантели', machine:'тренажёр', cable:'блок', smith:'Смит', kettlebell:'гиря', band:'резинка', body:'свой вес', other:'другое' };
const KINDS = {
  wr:     { label:'Вес и повторы', f:[['w','кг','decimal'],['r','повт','numeric']] },
  bw:     { label:'Свой вес',      f:[['w','+кг','decimal'],['r','повт','numeric']] },
  time:   { label:'На время',      f:[['w','+кг','decimal'],['t','сек','numeric']] },
  cardio: { label:'Кардио',        f:[['d','км','decimal'],['t','мин','decimal']] },
};
