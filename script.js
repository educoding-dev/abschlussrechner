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
        
        function gradeToNumeric(grade, forAbschluss) {
            if (grade === 'NB') return null;
            if (grade === 'B' || grade === 'KB') return 'FAIL';
            
            const gradeMap = {
                'E1': { esa: 1, msa: 1, gym: 1 },
                'E2': { esa: 1, msa: 1, gym: 1 },
                'E3': { esa: 2, msa: 2, gym: 2 },
                'E4/G1': { esa: 3, msa: 3, gym: 3 },
                'G2': { esa: 2, msa: 4, gym: 4 },
                'G3': { esa: 3, msa: 5, gym: 5 },
                'G4': { esa: 4, msa: 6, gym: 6 },
                'G5': { esa: 5, msa: 6, gym: 6 },
                'G6': { esa: 6, msa: 6, gym: 6 }
            };
            
            if (grade >= '1' && grade <= '6') {
                return parseInt(grade);
            }
            
            return gradeMap[grade]?.[forAbschluss] || null;
        }
        
        function convertSportGrade(sportGrade, withoutSportAbschluss) {
            if (sportGrade === 'NB') return null;
            if (sportGrade === 'B' || sportGrade === 'KB') return 'FAIL';
            
            const sportNum = parseInt(sportGrade);
            if (isNaN(sportNum)) return null;
            
            if (withoutSportAbschluss >= 2) {
                const sportToE = {
                    1: 'E1', 2: 'E2', 3: 'E3', 
                    4: 'E4/G1', 5: 'G2', 6: 'G3'
                };
                return sportToE[sportNum];
            } else {
                const sportToG = {
                    1: 'E4/G1', 2: 'G2', 3: 'G3',
                    4: 'G4', 5: 'G5', 6: 'G6'
                };
                return sportToG[sportNum];
            }
        }
        
        function calculatePrognosis() {
            const allSubjectsSelected = Object.keys(subjects).every(s => selectedGrades[s]);
            
            if (!allSubjectsSelected) {
                zeigeErgebnis('neutral', 'Noch nicht alle Noten eingegeben', 
                    'Bitte fülle alle Felder aus, um eine vollständige Berechnung zu erhalten.');
                return;
            }
            
            const allGrades = { ...selectedGrades };
            
            if (allGrades.sport && ['1','2','3','4','5','6'].includes(allGrades.sport)) {
                const withoutSport = { ...allGrades };
                delete withoutSport.sport;
                const withoutSportResult = checkAbschluss(withoutSport, false);
                const withoutSportAbschluss = withoutSportResult.level;
                
                allGrades.sport = convertSportGrade(allGrades.sport, withoutSportAbschluss);
            }
            
            const result = checkAbschluss(allGrades, true);
            displayResult(result);
        }
        
        function checkAbschluss(grades, includeSport) {
            const result = {
                level: 0,
                name: 'OA',
                fullName: 'Ohne Abschluss',
                reasons: [],
                details: {}
            };
            
            const mainSubjects = ['deutsch', 'englisch', 'mathematik'];
            const hasB = Object.values(grades).includes('B');
            const hasKB = Object.values(grades).includes('KB');
            
            if (hasB) {
                result.reasons.push('B (Bericht) schließt einen Abschluss aus');
                return result;
            }
            if (hasKB) {
                result.reasons.push('KB (keine Bewertung) schließt einen Abschluss aus');
                return result;
            }
            
            const gymResult = checkMSAGym(grades, mainSubjects);
            if (gymResult.success) {
                result.level = 3;
                result.name = 'MSA Gym';
                result.fullName = 'MSA mit Berechtigung zur Oberstufe (Sek. II)';
                result.details = gymResult.details;
                return result;
            }
            
            const msaResult = checkMSA(grades, mainSubjects);
            if (msaResult.success) {
                result.level = 2;
                result.name = 'MSA';
                result.fullName = 'Mittlerer Schulabschluss (MSA)';
                result.details = msaResult.details;
                return result;
            }
            
            const esaResult = checkESA(grades, mainSubjects);
            if (esaResult.success) {
                const hatE = mainSubjects.some(s => grades[s] && grades[s].startsWith('E'));
                if (hatE) {
                    result.level = 1.5;
                    result.name = 'eESA';
                    result.fullName = 'Erweiterter ESA (eESA)';
                    result.details = esaResult.details + '<br><br>Du hast mindestens eine Note im Erweiterungsniveau in den Hauptfächern erreicht, daher erhältst du den erweiterten ESA.';
                } else {
                    result.level = 1;
                    result.name = 'ESA';
                    result.fullName = 'Erster allgemeinbildender Schulabschluss (ESA)';
                    result.details = esaResult.details;
                }
                return result;
            }
            
            result.reasons.push('Keine ausreichenden Noten für einen Abschluss');
            return result;
        }
        
        function checkMSAGym(grades, mainSubjects) {
            const result = { success: false, details: '' };
            const numericGrades = {};
            
            for (let subject in grades) {
                if (grades[subject] === 'NB') continue;
                const numeric = gradeToNumeric(grades[subject], 'gym');
                if (numeric === 'FAIL') return result;
                numericGrades[subject] = numeric;
            }
            
            for (let subject of mainSubjects) {
                if (!numericGrades[subject] || numericGrades[subject] > 3) {
                    result.details = `${subject}: Mindestens E4 erforderlich`;
                    return result;
                }
            }
            
            const mainG2Count = mainSubjects.filter(s => 
                numericGrades[s] && gradeToNumeric(grades[s], 'gym') >= 4 &&
                ['G2', 'G3', 'G4', 'G5', 'G6'].includes(grades[s])
            ).length;
            
            if (mainG2Count >= 2) {
                result.details = 'Ausgeschlossen: 2x G2 oder schlechter in Hauptfächern';
                return result;
            }
            
            const mainG3 = mainSubjects.find(s => 
                numericGrades[s] && ['G3', 'G4', 'G5', 'G6'].includes(grades[s])
            );
            if (mainG3) {
                result.details = 'Ausgeschlossen: G3 oder schlechter in Hauptfach';
                return result;
            }
            
            const allG2 = Object.keys(numericGrades).filter(s => 
                numericGrades[s] >= 4 && ['G2', 'G3', 'G4', 'G5', 'G6'].includes(grades[s])
            );
            
            if (allG2.length > 2) {
                result.details = 'Zu viele Noten unter E4';
                return result;
            }
            
            if (allG2.length === 2) {
                const e2Count = Object.keys(numericGrades).filter(s => 
                    grades[s] === 'E2' || grades[s] === 'E1'
                ).length;
                if (e2Count < 2) {
                    result.details = '2x G2 benötigt 2x E2 zum Ausgleich';
                    return result;
                }
            }
            
            if (allG2.length === 1) {
                const g2Subject = allG2[0];
                if (['G2'].includes(grades[g2Subject])) {
                    const e2Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E2' || grades[s] === 'E1'
                    ).length;
                    const e3Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E3'
                    ).length;
                    
                    if (e2Count < 1 && e3Count < 2) {
                        result.details = 'G2 benötigt E2 oder 2x E3 zum Ausgleich';
                        return result;
                    }
                } else {
                    const e1Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E1'
                    ).length;
                    const e2Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E2' || grades[s] === 'E1'
                    ).length;
                    
                    if (e1Count < 1 && e2Count < 2) {
                        result.details = 'G3+ benötigt E1 oder 2x E2 zum Ausgleich';
                        return result;
                    }
                }
            }
            
            result.success = true;
            result.details = '🎉 Herzlichen Glückwunsch! Du hast die Berechtigung zum Übergang in die Oberstufe (Sek. II) erreicht.<br><br>Mit diesen Noten darfst du dich für die Sekundarstufe II anmelden.';
            return result;
        }
        
        function checkMSA(grades, mainSubjects) {
            const result = { success: false, details: '' };
            const numericGrades = {};
            
            for (let subject in grades) {
                if (grades[subject] === 'NB') continue;
                const numeric = gradeToNumeric(grades[subject], 'msa');
                if (numeric === 'FAIL') return result;
                numericGrades[subject] = numeric;
            }
            
            for (let subject of mainSubjects) {
                if (!numericGrades[subject] || numericGrades[subject] > 4) {
                    result.details = `${subject}: Mindestens G2 erforderlich`;
                    return result;
                }
            }
            
            const mainG3Count = mainSubjects.filter(s => 
                numericGrades[s] && numericGrades[s] >= 5
            ).length;
            
            if (mainG3Count >= 2) {
                result.details = 'Ausgeschlossen: 2x G3 oder schlechter in Hauptfächern';
                return result;
            }
            
            const mainG4 = mainSubjects.find(s => 
                numericGrades[s] && numericGrades[s] >= 6
            );
            if (mainG4) {
                result.details = 'Ausgeschlossen: G4 oder schlechter in Hauptfach';
                return result;
            }
            
            const allG3 = Object.keys(numericGrades).filter(s => 
                numericGrades[s] >= 5
            );
            
            if (allG3.length > 2) {
                result.details = 'Zu viele Noten unter G2';
                return result;
            }
            
            if (allG3.length === 2) {
                const e3Count = Object.keys(numericGrades).filter(s => 
                    grades[s] === 'E3' || grades[s] === 'E2' || grades[s] === 'E1'
                ).length;
                if (e3Count < 2) {
                    result.details = '2x G3 benötigt 2x E3 zum Ausgleich';
                    return result;
                }
            }
            
            if (allG3.length === 1) {
                const g3Subject = allG3[0];
                if (numericGrades[g3Subject] === 5) {
                    const e3Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E3' || grades[s] === 'E2' || grades[s] === 'E1'
                    ).length;
                    const e4Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E4/G1'
                    ).length;
                    
                    if (e3Count < 1 && e4Count < 2) {
                        result.details = 'G3 benötigt E3 oder 2x E4 zum Ausgleich';
                        return result;
                    }
                } else {
                    const e2Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E2' || grades[s] === 'E1'
                    ).length;
                    const e3Count = Object.keys(numericGrades).filter(s => 
                        grades[s] === 'E3' || grades[s] === 'E2' || grades[s] === 'E1'
                    ).length;
                    
                    if (e2Count < 1 && e3Count < 2) {
                        result.details = 'G4+ benötigt E2 oder 2x E3 zum Ausgleich';
                        return result;
                    }
                }
            }
            
            result.success = true;
            result.details = '🎉 Herzlichen Glückwunsch! Du hast den Mittleren Schulabschluss (MSA) erreicht.<br><br>Mit dem MSA kannst du eine Berufsausbildung beginnen.';
            return result;
        }
        
        function checkESA(grades, mainSubjects) {
            const result = { success: false, details: '' };
            const numericGrades = {};
            
            for (let subject in grades) {
                if (grades[subject] === 'NB') continue;
                const numeric = gradeToNumeric(grades[subject], 'esa');
                if (numeric === 'FAIL') return result;
                numericGrades[subject] = numeric;
            }
            
            for (let subject of mainSubjects) {
                if (!numericGrades[subject] || numericGrades[subject] > 4) {
                    result.details = `${subject}: Mindestens G4 erforderlich`;
                    return result;
                }
            }
            
            const deutschG5 = grades['deutsch'] === 'G5';
            const matheG5 = grades['mathematik'] === 'G5';
            if (deutschG5 && matheG5) {
                result.details = 'Ausgeschlossen: G5 in Deutsch UND Mathematik';
                return result;
            }
            
            if (mainSubjects.some(s => grades[s] === 'G6')) {
                result.details = 'Ausgeschlossen: G6 in einem Hauptfach';
                return result;
            }
            
            const g6Count = Object.values(numericGrades).filter(n => n >= 6).length;
            if (g6Count >= 2) {
                result.details = 'Ausgeschlossen: 2x G6 im Zeugnis';
                return result;
            }
            
            const g5Count = Object.values(numericGrades).filter(n => n >= 5).length;
            if (g5Count >= 3) {
                result.details = 'Ausgeschlossen: 3x G5 im Zeugnis (Nachprüfung möglich)';
                return result;
            }
            
            result.success = true;
            result.details = '✅ Herzlichen Glückwunsch! Du hast den Ersten allgemeinbildenden Schulabschluss (ESA) erreicht.<br><br>Mit dem ESA kannst du eine Berufsausbildung beginnen.';
            return result;
        }
        
        function displayResult(result) {
            let typ = 'neutral';
            let text = result.details || '';
            
            if (result.level === 0) {
                typ = 'error';
                if (result.reasons.length > 0) {
                    text = result.reasons.join('<br>') + '<br><br>Mit deinen aktuellen Noten erreichst du leider keinen Schulabschluss. Sprich mit deinen Lehrkräften über Fördermöglichkeiten und die Option einer Wiederholung.';
                }
            } else {
                typ = 'success';
            }
            
            zeigeErgebnis(typ, result.fullName, text);
        }
        
        function zeigeErgebnis(typ, titel, text) {
            const ergebnis = document.getElementById('ergebnis');
            ergebnis.className = 'result ' + typ;
            ergebnis.innerHTML = '<h3>' + titel + '</h3><p>' + text + '</p>';
        }
        
        initGrades();