// Inhoud "onthoudmap" leerjaar 5.
// Vraagtypes: mc (meerkeuze) | tf (juist/fout) | fill (invul) | match (koppel).

export const teachers = {
  ann: { naam: 'juf Ann', who: 'ann', vak: 'wiskunde' },
  sofie: { naam: 'juf Sofie', who: 'sofie', vak: 'nederlands' },
  tom: { naam: 'meester Tom', who: 'tom', vak: 'frans' }
};

export const vakken = {
  wiskunde: { naam: 'Wiskunde', kleur: '#1fa9ce', tint: '#e4f5fb', teacher: 'ann' },
  nederlands: { naam: 'Nederlands', kleur: '#9b8cff', tint: '#efecff', teacher: 'sofie' },
  frans: { naam: 'Frans', kleur: '#5fbe82', tint: '#e7f7ee', teacher: 'tom' }
};

export const nodes = [
  { id: 'breuken', vak: 'wiskunde', titel: 'Breuken', stars: 3, status: 'done' },
  { id: 'komma', vak: 'wiskunde', titel: 'Kommagetallen', stars: 2, status: 'done' },
  { id: 'maaldeel', vak: 'wiskunde', titel: 'Maal & deel', stars: 2, status: 'done' },
  { id: 'omtrek', vak: 'wiskunde', titel: 'Omtrek & oppervlakte', stars: 0, status: 'now' },
  { id: 'meten', vak: 'wiskunde', titel: 'Meten & wegen', stars: 0, status: 'lock' },
  { id: 'wwnu', vak: 'nederlands', titel: 'Werkwoorden: nu', stars: 0, status: 'lock' },
  { id: 'wwverleden', vak: 'nederlands', titel: 'Werkwoorden: verleden', stars: 0, status: 'lock' },
  { id: 'woordsoort', vak: 'nederlands', titel: 'Woordsoorten', stars: 0, status: 'lock' },
  { id: 'leestekens', vak: 'nederlands', titel: 'Leestekens', stars: 0, status: 'lock' },
  { id: 'nombres', vak: 'frans', titel: 'Les nombres', stars: 0, status: 'lock' },
  { id: 'famille', vak: 'frans', titel: 'La famille', stars: 0, status: 'lock' },
  { id: 'couleurs', vak: 'frans', titel: 'Les couleurs', stars: 0, status: 'lock' }
];

export const content = {
  omtrek: [
    {
      type: 'mc',
      q: 'Wat is de omtrek van een rechthoek van 6 cm op 4 cm?',
      options: ['10 cm', '20 cm', '24 cm', '12 cm'],
      answer: 1,
      theory: {
        titel: 'Omtrek van een rechthoek',
        text:
          'De omtrek is de lengte van de rand helemaal rond. Bij een rechthoek tel je alle zijden op, of korter: 2 keer de lengte plus 2 keer de breedte. Hier is dat 2 keer 6 plus 2 keer 4, dus 12 plus 8, samen 20 centimeter.'
      }
    },
    {
      type: 'tf',
      q: 'De oppervlakte van een vierkant met zijde 5 cm is 20 cm².',
      answer: false,
      theory: {
        titel: 'Oppervlakte van een vierkant',
        text:
          'Oppervlakte is hoeveel plaats er binnenin past. Bij een vierkant doe je zijde keer zijde. Vijf keer vijf is vijfentwintig, dus de oppervlakte is vijfentwintig vierkante centimeter. Twintig is dus fout.'
      }
    },
    {
      type: 'fill',
      q: 'Een vierkant heeft een zijde van 7 cm. Hoeveel is de omtrek?',
      suffix: 'cm',
      answer: '28',
      accept: ['28'],
      theory: {
        titel: 'Omtrek van een vierkant',
        text:
          'Een vierkant heeft vier even lange zijden. Je doet dus zijde keer vier. Zeven keer vier is achtentwintig. De omtrek is achtentwintig centimeter.'
      }
    },
    {
      type: 'mc',
      q: 'Hoeveel is de oppervlakte van een rechthoek van 8 cm op 3 cm?',
      options: ['11 cm²', '22 cm²', '24 cm²', '24 cm'],
      answer: 2,
      theory: {
        titel: 'Oppervlakte berekenen',
        text:
          'Voor de oppervlakte van een rechthoek doe je lengte keer breedte. Acht keer drie is vierentwintig. En let op de eenheid: oppervlakte schrijf je in vierkante centimeter, dus 24 cm².'
      }
    },
    {
      type: 'match',
      q: 'Koppel elke vorm aan de juiste formule.',
      pairs: [
        { l: 'Omtrek vierkant', r: 'zijde × 4' },
        { l: 'Oppervlakte rechthoek', r: 'l × b' },
        { l: 'Omtrek rechthoek', r: '2×l + 2×b' }
      ],
      theory: {
        titel: 'Welke formule wanneer?',
        text:
          'Omtrek gaat over de rand: bij een vierkant zijde keer vier, bij een rechthoek twee keer de lengte plus twee keer de breedte. Oppervlakte gaat over de binnenkant: lengte keer breedte.'
      }
    }
  ],
  breuken: [
    {
      type: 'mc',
      q: 'Welke breuk is het grootst?',
      options: ['1/2', '1/4', '3/4', '1/3'],
      answer: 2,
      theory: {
        titel: 'Breuken vergelijken',
        text:
          'Bij breuken met dezelfde noemer kijk je naar de teller: hoe groter de teller, hoe groter de breuk. Drie vierde is dus meer dan een vierde. En drie vierde is ook meer dan een half, want een half is twee vierde.'
      }
    },
    {
      type: 'tf',
      q: '1/2 is hetzelfde als 2/4.',
      answer: true,
      theory: {
        titel: 'Gelijkwaardige breuken',
        text:
          'Als je teller en noemer met hetzelfde getal vermenigvuldigt, blijft de breuk evenveel waard. Een half maal twee boven en onder wordt twee vierde. Het is dus exact hetzelfde stuk van de taart.'
      }
    },
    {
      type: 'fill',
      q: 'Vul aan: 3/4 + 1/4 = ...',
      answer: '1',
      accept: ['1', 'één', 'een', '4/4'],
      theory: {
        titel: 'Breuken optellen',
        text:
          'Als de noemer hetzelfde is, tel je gewoon de tellers op en laat je de noemer staan. Drie vierde plus een vierde is vier vierde. En vier vierde is een hele, dus het antwoord is één.'
      }
    },
    {
      type: 'mc',
      q: 'Hoeveel is de helft van 1/2?',
      options: ['1/4', '1/3', '2/4', '1'],
      answer: 0,
      theory: {
        titel: 'De helft van een breuk',
        text:
          'De helft nemen betekent in twee gelijke stukken delen. De helft van een half is een vierde. Denk aan een halve pizza die je nog eens doormidden snijdt: dan heb je een kwart.'
      }
    }
  ],
  wwnu: [
    {
      type: 'fill',
      q: 'Vul in: Ik ... (lopen) naar school.',
      answer: 'loop',
      accept: ['loop'],
      theory: {
        titel: 'Tegenwoordige tijd: ik-vorm',
        text:
          'In de tegenwoordige tijd gebruik je bij ik de stam van het werkwoord, zonder uitgang. De stam van lopen is loop. Dus: ik loop.'
      }
    },
    {
      type: 'mc',
      q: 'Welke vorm is juist? "Hij ... een brief."',
      options: ['schrijf', 'schrijft', 'schrijven', 'schreef'],
      answer: 1,
      theory: {
        titel: 'Stam + t',
        text:
          'Bij hij, zij of het komt er een t achter de stam. De stam van schrijven is schrijf, plus t wordt schrijft. Het ezelsbruggetje is: stam plus t.'
      }
    },
    {
      type: 'tf',
      q: '"Jij vindt" is juist geschreven.',
      answer: true,
      theory: {
        titel: 'Jij + werkwoord',
        text:
          'Bij jij staat de werkwoordsvorm met t: stam plus t. De stam van vinden is vind, plus t wordt vindt. Dus jij vindt is juist.'
      }
    },
    {
      type: 'match',
      q: 'Koppel het onderwerp aan de juiste vorm van "werken".',
      pairs: [
        { l: 'ik', r: 'werk' },
        { l: 'jij', r: 'werkt' },
        { l: 'wij', r: 'werken' }
      ],
      theory: {
        titel: 'De vormen op een rij',
        text:
          'Bij ik gebruik je de stam: werk. Bij jij, hij of zij komt er een t bij: werkt. Bij wij, jullie en zij gebruik je het hele werkwoord: werken.'
      }
    }
  ],
  nombres: [
    {
      type: 'mc',
      q: 'Wat betekent "quatorze"?',
      options: ['12', '14', '40', '4'],
      answer: 1,
      theory: {
        titel: 'Les nombres — 14',
        text:
          'Quatorze betekent veertien. Let op het verschil met quarante, dat is veertig. Quatorze hoor je aan de -orze op het einde.'
      }
    },
    {
      type: 'fill',
      q: 'Schrijf het Franse woord voor 20.',
      answer: 'vingt',
      accept: ['vingt'],
      theory: {
        titel: 'Vingt = 20',
        text:
          'Twintig is in het Frans vingt. Je schrijft v-i-n-g-t, maar de g en de t hoor je niet. Je zegt dus iets als "van".'
      }
    },
    {
      type: 'match',
      q: 'Koppel het Franse getal aan het cijfer.',
      pairs: [
        { l: 'douze', r: '12' },
        { l: 'seize', r: '16' },
        { l: 'dix-huit', r: '18' }
      ],
      theory: {
        titel: 'Getallen 12 tot 18',
        text:
          'Douze is twaalf, seize is zestien en dix-huit is achttien. Dix-huit is letterlijk tien-acht, dus tien plus acht is achttien.'
      }
    },
    {
      type: 'tf',
      q: '"trente" betekent dertien.',
      answer: false,
      theory: {
        titel: 'Trente = 30',
        text:
          'Trente betekent dertig, niet dertien. Dertien is treize. Trente en treize lijken op elkaar, dus luister goed naar het einde.'
      }
    }
  ]
};

content._default = content.breuken;

export function vragenVoor(nodeId) {
  return content[nodeId] || content._default;
}

export const leerjaren = [1, 2, 3, 4, 5, 6];
export const actiefLeerjaar = 5;
export const beschikbaar = [5];

export default {
  teachers,
  vakken,
  nodes,
  content,
  vragenVoor,
  leerjaren,
  actiefLeerjaar,
  beschikbaar
};
