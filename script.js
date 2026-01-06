const grades = ['E1', 'E2', 'E3', 'E4/G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'B', 'KB', 'NB'];
const sportGrades = ['1', '2', '3', '4', '5', '6', 'B', 'KB', 'NB'];

const subjects = {
    'deutsch': { name: 'Deutsch', main: true },
    'englisch': { name: 'Englisch', main: true },
    'mathematik': { name: 'Mathematik', main: true },
    'pgw': { name: 'PGW', main: false },
    'religion': { name: 'Religion', main: false },
    'sport': { name: 'Sport', main: false, special: true },
    'physik': { name: 'Physik', main: false },
    'chemie': { name: 'Chemie', main: false },
    'biologie': { name: 'Biologie', main: false },
    'kuenste': { name: 'Künste', main: false },
    'wpk': { name: 'WPK', main: false },
    'beruf': { name: 'Berufsvorbereitung', main: false }
};

const selectedGrades = {};

function initGrades() {
    Object.keys(subjects).forEach(subject => {
        const container = document.getElementById(`${subject}-grades`);
        const gradeList = subject === 'sport' ? sportGrades : grades;
        
        gradeList.forEach(grade => {
            const option = document.createElement('div');
            option.className = 'grade-option';
            
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = subject;
            input.id = `${subject}-${grade}`;
            input.value = grade;
            input.addEventListener('change', () => {
                selectedGrades[subject] = grade;
                calculatePrognosis();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `${subject}-${grade}`;
            label.textContent = grade;
            
            option.appendChild(input);
            option.appendChild(label);
            container.appendChild(option);
        });
    });
}

function gradeToValue(grade) {
    const gradeMap = {
        'E1': 9, 'E2': 8, 'E3': 7, 'E4/G1': 6,
        'G2': 5, 'G3': 4, 'G4': 3, 'G5': 2, 'G6': 1,
        'B': 0, 'KB': 0, 'NB': null
    };
    
    if (grade >= '1' && grade <= '6') {
        return 7 - parseInt(grade); // 1->6, 2->5, 3->4, 4->3, 5->2, 6->1
    }
    
    return gradeMap[grade];
}

function calculateAverage(grades) {
    let sum = 0;
    let count = 0;
    
    for (let subject in grades) {
        const value = gradeToValue(grades[subject]);
        if (value !== null && value > 0) {
            sum += value;
            count++;
        }
    }
    
    return count > 0 ? sum / count : 0;
}

function convertSportGrade(sportGrade, abschlussLevel) {
    if (sportGrade === 'NB' || sportGrade === 'B' || sportGrade === 'KB') {
        return sportGrade;
    }
    
    const sportNum = parseInt(sportGrade);
    if (isNaN(sportNum)) return sportGrade;
    
    // Level 3 = Gym, Level 2 = MSA, Level 1 = ESA, Level 0 = OA
    if (abschlussLevel >= 3) {
        // Gym: Sport 1-6 -> E1-G3
        const mapping = { 1: 'E1', 2: 'E2', 3: 'E3', 4: 'E4/G1', 5: 'G2', 6: 'G3' };
        return mapping[sportNum] || 'G3';
    } else if (abschlussLevel >= 2) {
        // MSA: Sport 1-6 -> E2-G4
        const mapping = { 1: 'E2', 2: 'E3', 3: 'E4/G1', 4: 'G2', 5: 'G3', 6: 'G4' };
        return mapping[sportNum] || 'G4';
    } else {
        // ESA: Sport 1-6 -> E4/G1-G6
        const mapping = { 1: 'E4/G1', 2: 'G2', 3: 'G3', 4: 'G4', 5: 'G5', 6: 'G6' };
        return mapping[sportNum] || 'G6';
    }
}

function calculatePrognosis() {
    const allSubjectsSelected = Object.keys(subjects).every(s => selectedGrades[s]);
    
    if (!allSubjectsSelected) {
        zeigeErgebnis('neutral', 'Noch nicht alle Noten eingegeben', 
            'Bitte fülle alle Felder aus, um eine vollständige Berechnung zu erhalten.');
        return;
    }
    
    let allGrades = { ...selectedGrades };
    
    // Prüfe B oder KB - schließt alle Abschlüsse aus
    const bkbSubjects = Object.keys(allGrades).filter(s => allGrades[s] === 'B' || allGrades[s] === 'KB');
    if (bkbSubjects.length > 0) {
        const bkbNames = bkbSubjects.map(s => subjects[s].name).join(', ');
        const result = {
            level: 0,
            name: 'OA',
            fullName: 'Ohne Abschluss',
            problematicGrades: bkbSubjects.map(s => ({
                subject: subjects[s].name,
                grade: allGrades[s],
                reason: 'B oder KB schließt jeden Abschluss aus',
                canCompensate: false
            })),
            compensations: []
        };
        displayResult(result);
        return;
    }
    
    // Berechne ohne Sport
    if (allGrades.sport && ['1','2','3','4','5','6'].includes(allGrades.sport)) {
        const withoutSport = { ...allGrades };
        delete withoutSport.sport;
        
        const withoutSportResult = checkAbschluss(withoutSport);
        allGrades.sport = convertSportGrade(allGrades.sport, withoutSportResult.level);
    }
    
    const result = checkAbschluss(allGrades);
    displayResult(result);
}

function checkAbschluss(grades) {
    // Prüfe in Reihenfolge: Gym -> MSA -> ESA
    
    // 1. Versuche MSA mit Gym
    const msaResult = checkMSA(grades);
    if (msaResult.success) {
        const gymResult = checkGym(grades);
        if (gymResult.success) {
            return {
                level: 3,
                name: 'MSA Gym',
                fullName: 'MSA mit Berechtigung zur Oberstufe (Sek. II)',
                problematicGrades: gymResult.problematicGrades || [],
                compensations: gymResult.compensations || [],
                details: '🎉 <strong>Herzlichen Glückwunsch!</strong> Du hast die Berechtigung zum Übergang in die Oberstufe (Sek. II) erreicht.<br><br>Mit diesen Noten darfst du dich für die Sekundarstufe II anmelden.'
            };
        }
        
        // Nur MSA
        return {
            level: 2,
            name: 'MSA',
            fullName: 'Mittlerer Schulabschluss (MSA)',
            problematicGrades: msaResult.problematicGrades || [],
            compensations: msaResult.compensations || [],
            details: '🎉 <strong>Herzlichen Glückwunsch!</strong> Du hast den Mittleren Schulabschluss (MSA) erreicht.<br><br>Mit dem MSA kannst du eine Berufsausbildung beginnen.'
        };
    }
    
    // 2. Versuche ESA
    const esaResult = checkESA(grades);
    if (esaResult.success) {
        return {
            level: 1,
            name: 'ESA',
            fullName: 'Erster allgemeinbildender Schulabschluss (ESA)',
            problematicGrades: esaResult.problematicGrades || [],
            compensations: esaResult.compensations || [],
            details: '✅ <strong>Herzlichen Glückwunsch!</strong> Du hast den Ersten allgemeinbildenden Schulabschluss (ESA) erreicht.<br><br>Mit dem ESA kannst du eine Berufsausbildung beginnen.<br><br><em>Hinweis: Wenn du nach Jahrgang 9 einen ESA erreicht hast und die Noten des Schuljahres 10 ebenfalls den ESA-Anforderungen entsprechen, erhältst du den erweiterten ESA (eESA).</em>'
        };
    }
    
    // 3. Kein Abschluss - sammle alle Probleme
    const allProblems = [
        ...(esaResult.allProblems || [])
    ];
    
    return {
        level: 0,
        name: 'OA',
        fullName: 'Ohne Abschluss',
        problematicGrades: allProblems,
        compensations: []
    };
}

function checkESA(grades) {
    const result = {
        success: false,
        problematicGrades: [],
        compensations: [],
        allProblems: []
    };
    
    const mainSubjects = ['deutsch', 'englisch', 'mathematik'];
    
    // Durchschnitt mindestens G4 (Wert 3)
    const avg = calculateAverage(grades);
    if (avg < 3) {
        result.allProblems.push({
            subject: 'Durchschnitt',
            grade: `⌀${avg.toFixed(2)}`,
            reason: 'Durchschnitt muss mindestens G4 (Wert 3) sein',
            canCompensate: false
        });
        return result;
    }
    
    // G5 in Deutsch UND Mathematik ausgeschlossen
    if ((grades['deutsch'] === 'G5' || grades['deutsch'] === 'G6') && 
        (grades['mathematik'] === 'G5' || grades['mathematik'] === 'G6')) {
        result.allProblems.push({
            subject: 'Deutsch & Mathematik',
            grade: `${grades['deutsch']} & ${grades['mathematik']}`,
            reason: 'G5 in Deutsch UND Mathematik schließt ESA aus',
            canCompensate: false
        });
        return result;
    }
    
    // G6 in Hauptfächern ausgeschlossen
    const mainG6 = mainSubjects.filter(s => grades[s] === 'G6');
    if (mainG6.length > 0) {
        mainG6.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: 'G6',
                reason: 'G6 in Hauptfach schließt ESA aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // Mehr als eine G6 ausgeschlossen
    const allG6 = Object.keys(grades).filter(s => grades[s] === 'G6');
    if (allG6.length > 1) {
        allG6.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: 'G6',
                reason: 'Mehr als eine G6 schließt ESA aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // Mehr als zwei G5
    const allG5 = Object.keys(grades).filter(s => grades[s] === 'G5');
    if (allG5.length > 2) {
        allG5.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: 'G5',
                reason: 'Mehr als zwei G5 schließt ESA aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    result.success = true;
    return result;
}

function checkMSA(grades) {
    const result = {
        success: false,
        problematicGrades: [],
        compensations: [],
        allProblems: []
    };
    
    const mainSubjects = ['deutsch', 'englisch', 'mathematik'];
    
    // Durchschnitt mindestens G2 (Wert 5)
    const avg = calculateAverage(grades);
    if (avg < 5) {
        result.allProblems.push({
            subject: 'Durchschnitt',
            grade: `⌀${avg.toFixed(2)}`,
            reason: 'Durchschnitt muss mindestens G2 (Wert 5) sein',
            canCompensate: false
        });
        return result;
    }
    
    // 2x G3 in Hauptfächern ausgeschlossen
    const mainG3 = mainSubjects.filter(s => grades[s] === 'G3' || gradeToValue(grades[s]) < 4);
    if (mainG3.length >= 2) {
        mainG3.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: grades[s],
                reason: '2x G3 in Hauptfächern schließt MSA aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // G4 oder schlechter in Hauptfächern ausgeschlossen
    const mainG4 = mainSubjects.filter(s => gradeToValue(grades[s]) <= 3);
    if (mainG4.length > 0) {
        mainG4.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: grades[s],
                reason: 'G4 oder schlechter in Hauptfach schließt MSA aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // Mehr als zwei G3 ausgeschlossen
    const allG3 = Object.keys(grades).filter(s => grades[s] === 'G3');
    if (allG3.length > 2) {
        allG3.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: 'G3',
                reason: 'Mehr als zwei G3 schließt MSA aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // G3 oder schlechter UND G3 in zwei Fächern ausgeschlossen
    const allG3OrWorse = Object.keys(grades).filter(s => gradeToValue(grades[s]) <= 4);
    const allG4OrWorse = Object.keys(grades).filter(s => gradeToValue(grades[s]) <= 3);
    if (allG4OrWorse.length >= 1 && allG3.length >= 2) {
        result.allProblems.push({
            subject: 'Mehrere Fächer',
            grade: 'G3 und schlechter',
            reason: 'G3 oder schlechter UND G3 in zwei Fächern schließt MSA aus',
            canCompensate: false
        });
        return result;
    }
    
    // Prüfe Notenausgleich für G3
    const needsCompensation = Object.keys(grades).filter(s => grades[s] === 'G3');
    const e4Count = Object.keys(grades).filter(s => grades[s] === 'E4/G1' || gradeToValue(grades[s]) > 6).length;
    const e3Count = Object.keys(grades).filter(s => gradeToValue(grades[s]) >= 7).length;
    
    for (let subject of needsCompensation) {
        if (e4Count >= 1 || e3Count >= 2) {
            result.problematicGrades.push({
                subject: subjects[subject].name,
                grade: 'G3',
                reason: 'Wird ausgeglichen',
                canCompensate: true
            });
            
            if (e4Count >= 1) {
                result.compensations.push({
                    subject: subjects[subject].name,
                    grade: 'G3',
                    compensation: 'E4 oder besser'
                });
            } else {
                result.compensations.push({
                    subject: subjects[subject].name,
                    grade: 'G3',
                    compensation: '2x E3'
                });
            }
        } else {
            result.allProblems.push({
                subject: subjects[subject].name,
                grade: 'G3',
                reason: 'G3 benötigt E4 oder 2x E3 zum Ausgleich (nicht vorhanden)',
                canCompensate: false
            });
            return result;
        }
    }
    
    // Prüfe Notenausgleich für G4
    const needsG4Compensation = Object.keys(grades).filter(s => grades[s] === 'G4');
    
    for (let subject of needsG4Compensation) {
        if (e3Count >= 2) {
            result.problematicGrades.push({
                subject: subjects[subject].name,
                grade: 'G4',
                reason: 'Wird ausgeglichen',
                canCompensate: true
            });
            result.compensations.push({
                subject: subjects[subject].name,
                grade: 'G4',
                compensation: '2x E3'
            });
        } else {
            result.allProblems.push({
                subject: subjects[subject].name,
                grade: 'G4',
                reason: 'G4 benötigt 2x E3 zum Ausgleich (nicht vorhanden)',
                canCompensate: false
            });
            return result;
        }
    }
    
    result.success = true;
    return result;
}

function checkGym(grades) {
    const result = {
        success: false,
        problematicGrades: [],
        compensations: [],
        allProblems: []
    };
    
    const mainSubjects = ['deutsch', 'englisch', 'mathematik'];
    
    // Alle Fächer mindestens E4
    const underE4 = Object.keys(grades).filter(s => gradeToValue(grades[s]) < 6);
    
    // 2x G2 oder schlechter in Hauptfächern ausgeschlossen
    const mainG2OrWorse = mainSubjects.filter(s => gradeToValue(grades[s]) <= 5);
    if (mainG2OrWorse.length >= 2) {
        mainG2OrWorse.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: grades[s],
                reason: '2x G2 oder schlechter in Hauptfächern schließt Gym aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // G2 oder schlechter UND G3 oder schlechter in zwei Fächern ausgeschlossen
    const allG2OrWorse = Object.keys(grades).filter(s => gradeToValue(grades[s]) <= 5);
    const allG3OrWorse = Object.keys(grades).filter(s => gradeToValue(grades[s]) <= 4);
    if (allG2OrWorse.length >= 1 && allG3OrWorse.length >= 2) {
        result.allProblems.push({
            subject: 'Mehrere Fächer',
            grade: 'G2/G3 und schlechter',
            reason: 'G2 oder schlechter UND G3 oder schlechter in zwei Fächern schließt Gym aus',
            canCompensate: false
        });
        return result;
    }
    
    // Mehr als zwei Fächer mit G2 oder schlechter ausgeschlossen
    if (allG2OrWorse.length > 2) {
        allG2OrWorse.forEach(s => {
            result.allProblems.push({
                subject: subjects[s].name,
                grade: grades[s],
                reason: 'Mehr als zwei Fächer mit G2 oder schlechter schließt Gym aus',
                canCompensate: false
            });
        });
        return result;
    }
    
    // Prüfe Notenausgleich
    const e1Count = Object.keys(grades).filter(s => grades[s] === 'E1').length;
    const e2Count = Object.keys(grades).filter(s => grades[s] === 'E2' || grades[s] === 'E1').length;
    const e3Count = Object.keys(grades).filter(s => gradeToValue(grades[s]) >= 7).length;
    
    for (let subject of underE4) {
        const grade = grades[subject];
        
        if (grade === 'G2') {
            if (e2Count >= 1 || e3Count >= 2) {
                result.problematicGrades.push({
                    subject: subjects[subject].name,
                    grade: 'G2',
                    reason: 'Wird ausgeglichen',
                    canCompensate: true
                });
                
                if (e2Count >= 1) {
                    result.compensations.push({
                        subject: subjects[subject].name,
                        grade: 'G2',
                        compensation: 'E2'
                    });
                } else {
                    result.compensations.push({
                        subject: subjects[subject].name,
                        grade: 'G2',
                        compensation: '2x E3'
                    });
                }
            } else {
                result.allProblems.push({
                    subject: subjects[subject].name,
                    grade: 'G2',
                    reason: 'G2 benötigt E2 oder 2x E3 zum Ausgleich (nicht vorhanden)',
                    canCompensate: false
                });
                return result;
            }
        } else if (grade === 'G3' || gradeToValue(grade) <= 4) {
            if (e1Count >= 1 || e2Count >= 2) {
                result.problematicGrades.push({
                    subject: subjects[subject].name,
                    grade: grade,
                    reason: 'Wird ausgeglichen',
                    canCompensate: true
                });
                
                if (e1Count >= 1) {
                    result.compensations.push({
                        subject: subjects[subject].name,
                        grade: grade,
                        compensation: 'E1'
                    });
                } else {
                    result.compensations.push({
                        subject: subjects[subject].name,
                        grade: grade,
                        compensation: '2x E2'
                    });
                }
            } else {
                result.allProblems.push({
                    subject: subjects[subject].name,
                    grade: grade,
                    reason: 'G3 benötigt E1 oder 2x E2 zum Ausgleich (nicht vorhanden)',
                    canCompensate: false
                });
                return result;
            }
        }
    }
    
    result.success = true;
    return result;
}

function displayResult(result) {
    let typ = 'neutral';
    let text = '';
    
    if (result.level === 0) {
        typ = 'error';
        text = '<div style="margin-bottom: 15px;"><strong>🚫 Noten, die einen Abschluss ausschließen:</strong></div>';
        text += '<ul style="margin-left: 20px; line-height: 1.8;">';
        result.problematicGrades.forEach(item => {
            text += `<li><strong>${item.subject} (${item.grade}):</strong> ${item.reason}</li>`;
        });
        text += '</ul>';
        text += '<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">💡 <strong>Tipp:</strong> Sprich mit deinen Lehrkräften über Fördermöglichkeiten und die Option einer Wiederholung.</div>';
    } else {
        typ = 'success';
        text = result.details;
        
        if (result.problematicGrades && result.problematicGrades.length > 0) {
            text += '<div style="margin-top: 20px; padding: 12px; background: #fff9e6; border-left: 3px solid #ffa726; border-radius: 4px;">';
            text += '<div style="font-weight: bold; margin-bottom: 8px;">⚠️ Noten, die ausgeglichen werden:</div>';
            text += '<ul style="margin-left: 20px; line-height: 1.8;">';
            result.problematicGrades.forEach(item => {
                text += `<li><strong>${item.subject} (${item.grade}):</strong> ${item.reason}</li>`;
            });
            text += '</ul></div>';
        }
        
        if (result.compensations && result.compensations.length > 0) {
            text += '<div style="margin-top: 15px; padding: 12px; background: #e3f2fd; border-left: 3px solid #2196f3; border-radius: 4px;">';
            text += '<div style="font-weight: bold; margin-bottom: 8px;">ℹ️ Notenausgleich im Detail:</div>';
            text += '<ul style="margin-left: 20px; line-height: 1.8;">';
            result.compensations.forEach(comp => {
                text += `<li><strong>${comp.subject} (${comp.grade})</strong> wird durch ${comp.compensation} ausgeglichen</li>`;
            });
            text += '</ul></div>';
        }
    }
    
    zeigeErgebnis(typ, result.fullName, text);
}

function zeigeErgebnis(typ, titel, text) {
    const ergebnis = document.getElementById('ergebnis');
    ergebnis.className = 'result ' + typ;
    ergebnis.innerHTML = '<h3>' + titel + '</h3><p>' + text + '</p>';
}

initGrades();