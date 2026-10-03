const csvUrl =
    "https://raw.githubusercontent.com/dd4521/exec.2026/main/data.csv";


const GRADES = [
    "E0",
    "E1",
    "E2",
    "E3",
    "E4",
    "E5",
    "E6",
    "E7",
    "E8"
];


let employees = [];
let displayedEmployees = [];


const activeFilterState = {
    units: [],
    departments: [],
    grades: [],
    bloodGroups: [],
    eligible: "",
    delay: "",
    gradeYears: "",
    experience: ""
};



/* =========================================================
   LOAD CSV
========================================================= */

fetch(csvUrl, { cache: "no-store" })

    .then(response => {

        if (!response.ok) {
            throw new Error(
                `CSV loading failed: ${response.status}`
            );
        }

        return response.text();

    })

    .then(csv => {

        employees = parseCSV(csv)
            .map(enrichEmployee)
            .filter(emp => emp.Name);

        createFilterOptions();

        updateDisplay();

    })

    .catch(error => {

        console.error(error);

        document.getElementById("employeeList").innerHTML = `
            <div class="no-results">
                Unable to load employee data.
            </div>
        `;

    });



/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;


    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        const nextChar = text[i + 1];


        if (char === '"' && insideQuotes && nextChar === '"') {

            value += '"';
            i++;

        }

        else if (char === '"') {

            insideQuotes = !insideQuotes;

        }

        else if (char === "," && !insideQuotes) {

            row.push(value.trim());
            value = "";

        }

        else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                nextChar === "\n"
            ) {
                i++;
            }


            row.push(value.trim());

            value = "";


            if (row.some(cell => cell !== "")) {
                rows.push(row);
            }

            row = [];

        }

        else {

            value += char;

        }

    }


    if (value || row.length) {

        row.push(value.trim());

        if (row.some(cell => cell !== "")) {
            rows.push(row);
        }

    }


    if (!rows.length) {
        return [];
    }


    headers.forEach((h, i) => {
    const cleanKey = h
        .replace(/\u00A0/g, " ")   // remove non-breaking spaces
        .replace(/\./g, "")       // remove dots (Emp No.)
        .replace(/\s+/g, " ")     // normalize multiple spaces
        .trim();

    obj[cleanKey] = values[i]?.trim();
});


    return rows
        .slice(1)
        .map(values => {

            const obj = {};

            headers.forEach((header, index) => {

                obj[header] =
                    (values[index] || "").trim();

            });

            return obj;

        });

}



/* =========================================================
   EMPLOYEE DATA ENRICHMENT
========================================================= */

function enrichEmployee(emp) {

    let currentGrade = null;
    let currentGradeDate = null;


    GRADES.forEach(grade => {

        const date = parseDate(emp[grade]);

        if (date) {

            currentGrade = grade;
            currentGradeDate = date;

        }

    });


    const doj = parseDate(emp.DOJ);

    const dob = parseDate(emp.DOB);


    /*
      If there is no E0-E7 entry,
      treat DOJ as E0 for calculation.
    */

    if (!currentGradeDate && doj) {

        currentGrade = "E0";
        currentGradeDate = doj;

    }


    emp.currentGrade = currentGrade;

    emp.currentGradeDate = currentGradeDate;

    emp.dojDate = doj;

    emp.dobDate = dob;


    emp.ageMonths =
        dob
            ? completeMonthsBetween(
                dob,
                new Date()
            )
            : null;


    emp.experienceMonths =
        doj
            ? completeMonthsBetween(
                doj,
                new Date()
            )
            : null;


    emp.gradeMonths =
        currentGradeDate
            ? completeMonthsBetween(
                currentGradeDate,
                new Date()
            )
            : null;


    emp.nextDueDate =
        currentGradeDate
            ? addYears(
                currentGradeDate,
                4
            )
            : null;


    emp.eligible =
        emp.nextDueDate
            ? startOfToday() >= emp.nextDueDate
            : null;


    emp.delayMonths =
        emp.eligible
            ? completeMonthsBetween(
                emp.nextDueDate,
                new Date()
            )
            : null;


    return emp;

}



/* =========================================================
   DATE HANDLING
========================================================= */

/*
 Accepted:
 01-11-2011
 1-11-2011

 Also accepts / as protection:
 01/11/2011

 Display is always:
 1-Nov-2011
*/

function parseDate(value) {

    if (!value) {
        return null;
    }


    const clean =
        String(value)
            .trim()
            .replace(/\//g, "-");


    const match =
        clean.match(
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        );


    if (!match) {
        return null;
    }


    const day =
        Number(match[1]);

    const month =
        Number(match[2]);

    const year =
        Number(match[3]);


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {

        return null;

    }


    return date;

}



function formatDate(date) {

    if (!date) {
        return "";
    }


    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];


    return (
        date.getDate() +
        "-" +
        months[date.getMonth()] +
        "-" +
        date.getFullYear()
    );

}



function startOfToday() {

    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

}



function addYears(date, years) {

    if (!date) {
        return null;
    }


    const result =
        new Date(
            date.getFullYear() + years,
            date.getMonth(),
            date.getDate()
        );


    return result;

}



/* =========================================================
   AGE / EXPERIENCE CALCULATION
========================================================= */

function completeMonthsBetween(startDate, endDate) {

    if (!startDate || !endDate) {
        return null;
    }


    let months =
        (
            endDate.getFullYear() -
            startDate.getFullYear()
        ) * 12;


    months +=
        endDate.getMonth() -
        startDate.getMonth();


    if (
        endDate.getDate() <
        startDate.getDate()
    ) {

        months--;

    }


    return Math.max(
        0,
        months
    );

}



function formatMonths(totalMonths) {

    if (
        totalMonths === null ||
        totalMonths === undefined
    ) {

        return "";

    }


    const years =
        Math.floor(
            totalMonths / 12
        );


    const months =
        totalMonths % 12;


    const yearText =
        `${years} ${years === 1 ? "year" : "years"}`;


    const monthText =
        `${months} ${months === 1 ? "month" : "months"}`;


    return `${yearText} ${monthText}`;

}



/* =========================================================
   SENIORITY SORT
========================================================= */

function compareSeniority(a, b) {

    const gradeA =
        GRADES.indexOf(
            a.currentGrade
        );

    const gradeB =
        GRADES.indexOf(
            b.currentGrade
        );


    /*
      Higher grade is senior.
    */

    if (gradeA !== gradeB) {

        return gradeB - gradeA;

    }


    /*
      Same grade:
      compare current grade date,
      then previous grade dates recursively.
    */

    for (
        let index = gradeA;
        index >= 0;
        index--
    ) {

        const grade =
            GRADES[index];


        const dateA =
            parseDate(
                a[grade]
            );


        const dateB =
            parseDate(
                b[grade]
            );


        if (
            dateA &&
            dateB &&
            dateA.getTime() !==
            dateB.getTime()
        ) {

            return (
                dateA.getTime() -
                dateB.getTime()
            );

        }

    }


    /*
      Final tie breaker:
      smaller employee number is senior.
    */

    return (
        employeeNumber(a) -
        employeeNumber(b)
    );

}



function employeeNumber(emp) {

    const value =
        Number(
            String(
                emp["Emp No"] || ""
            )
            .replace(/\D/g, "")
        );


    return Number.isFinite(value)
        ? value
        : Number.MAX_SAFE_INTEGER;

}



/* =========================================================
   OTHER SORTING
========================================================= */

function sortEmployees(list) {

    const sort =
        document.getElementById(
            "sortSelect"
        ).value;


    if (sort === "seniority") {

        list.sort(compareSeniority);

    }


    else if (sort === "name") {

        list.sort(
            (a, b) =>
                (a.Name || "")
                    .localeCompare(
                        b.Name || ""
                    )
        );

    }


    else if (sort === "grade") {

        list.sort((a, b) => {

            const gradeA =
                GRADES.indexOf(
                    a.currentGrade
                );

            const gradeB =
                GRADES.indexOf(
                    b.currentGrade
                );


            return gradeB - gradeA;

        });

    }


    else if (sort === "experience") {

        list.sort(
            (a, b) =>
                (b.experienceMonths || 0) -
                (a.experienceMonths || 0)
        );

    }


    else if (sort === "delay") {

        list.sort(
            (a, b) =>
                (b.delayMonths || 0) -
                (a.delayMonths || 0)
        );

    }

}



/* =========================================================
   SEARCH + FILTERS
========================================================= */

function updateDisplay() {

    const search =
        document.getElementById(
            "searchBox"
        )
        .value
        .trim()
        .toLowerCase();


    let list =
        employees.filter(emp => {

            const searchText = [
                emp["Emp No"],
                emp.Name,
                emp["Blood Group"],
                emp.Phone,
                emp.Residence,
                emp.Email,
                emp.Unit,
                emp.Department,
                getDesignation(emp.currentGrade),
                emp.currentGrade
            ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


            if (
                search &&
                !searchText.includes(search)
            ) {

                return false;

            }


            if (
                activeFilterState.units.length &&
                !activeFilterState.units.includes(
                    emp.Unit
                )
            ) {

                return false;

            }


            if (
                activeFilterState.departments.length &&
                !activeFilterState.departments.includes(
                    emp.Department
                )
            ) {

                return false;

            }


            if (
                activeFilterState.grades.length &&
                !activeFilterState.grades.includes(
                    emp.currentGrade
                )
            ) {

                return false;

            }


            if (
                activeFilterState.bloodGroups.length &&
                !activeFilterState.bloodGroups.includes(
                    emp["Blood Group"]
                )
            ) {

                return false;

            }


            if (
                activeFilterState.eligible === "yes" &&
                emp.eligible !== true
            ) {

                return false;

            }


            if (
                activeFilterState.eligible === "no" &&
                emp.eligible !== false
            ) {

                return false;

            }


            if (
                !matchesDelayFilter(emp)
            ) {

                return false;

            }


            if (
                !matchesGradeYearsFilter(emp)
            ) {

                return false;

            }


            if (
                !matchesExperienceFilter(emp)
            ) {

                return false;

            }


            return true;

        });


    sortEmployees(list);


    displayedEmployees = list;


    renderEmployeeList(list);

    renderActiveFilters();

}



/* =========================================================
   FILTER RANGE HELPERS
========================================================= */

function matchesRange(
    months,
    filter,
    ranges
) {

    if (!filter) {
        return true;
    }


    if (
        months === null ||
        months === undefined
    ) {

        return false;

    }


    const years =
        months / 12;


    const range =
        ranges[filter];


    if (!range) {
        return true;
    }


    return (
        years >= range.min &&
        (
            range.max === null ||
            years < range.max
        )
    );

}



function matchesDelayFilter(emp) {

    return matchesRange(
        emp.delayMonths,
        activeFilterState.delay,
        {
            "0-1": {
                min: 0,
                max: 1
            },

            "1-2": {
                min: 1,
                max: 2
            },

            "2-4": {
                min: 2,
                max: 4
            },

            "4+": {
                min: 4,
                max: null
            }
        }
    );

}



function matchesGradeYearsFilter(emp) {

    return matchesRange(
        emp.gradeMonths,
        activeFilterState.gradeYears,
        {
            "0-2": {
                min: 0,
                max: 2
            },

            "2-4": {
                min: 2,
                max: 4
            },

            "4-6": {
                min: 4,
                max: 6
            },

            "6+": {
                min: 6,
                max: null
            }
        }
    );

}



function matchesExperienceFilter(emp) {

    return matchesRange(
        emp.experienceMonths,
        activeFilterState.experience,
        {
            "0-5": {
                min: 0,
                max: 5
            },

            "5-10": {
                min: 5,
                max: 10
            },

            "10-20": {
                min: 10,
                max: 20
            },

            "20+": {
                min: 20,
                max: null
            }
        }
    );

}



/* =========================================================
   EMPLOYEE LIST
========================================================= */

function renderEmployeeList(list) {

    const container =
        document.getElementById(
            "employeeList"
        );


    document.getElementById(
        "employeeCount"
    ).textContent =
        `${list.length} of ${employees.length} employees`;


    if (!list.length) {

        container.innerHTML = `
            <div class="no-results">
                No employees found.
            </div>
        `;

        return;

    }


    container.innerHTML =
        list
            .map(
                (emp, index) =>
                    employeeCardHTML(
                        emp,
                        index
                    )
            )
            .join("");


    container
        .querySelectorAll(
            ".employee-card"
        )
        .forEach(card => {

    card.addEventListener("click", () => {
    showProfile(emp);
    });

   });

}


function employeeCardHTML(
    emp,
    index
) {

    const designation = getDesignation(emp.currentGrade);
            ? escapeHTML(
                getDesignation(emp.currentGrade)
            )
            : "";


    const meta = [
        emp.Unit,
        emp.Department,
        emp["Emp No"]
            ? `Emp ${emp["Emp No"]}`
            : ""
    ]
    .filter(Boolean)
    .join(" • ");


    return `
        <article
            class="employee-card"
            data-emp="${escapeHTML(
                emp["Emp No"] || ""
            )}"
        >

            <div class="serial-number">
                ${index + 1}
            </div>


            <div>

                <div class="employee-name">
                    ${escapeHTML(
                        emp.Name || ""
                    )}
                </div>

                ${
                    designation
                        ? `
                            <div class="employee-designation">
                                ${designation}
                            </div>
                        `
                        : ""
                }

                ${
                    meta
                        ? `
                            <div class="employee-meta">
                                ${escapeHTML(meta)}
                            </div>
                        `
                        : ""
                }

            </div>


            <div>

                ${
                    emp.currentGrade
                        ? `
                            <div class="grade-badge">
                                ${emp.currentGrade}
                            </div>
                        `
                        : ""
                }

                ${
                    emp.eligible === true
                        ? `
                            <div class="eligibility-small eligible">
                                Eligible
                            </div>
                        `
                        : emp.eligible === false
                            ? `
                                <div class="eligibility-small not-eligible">
                                    Not due
                                </div>
                            `
                            : ""
                }

            </div>

        </article>
    `;

}



/* =========================================================
   PROFILE
========================================================= */

function showProfile(e){
    try {
        const m = document.getElementById("profileModal");
        m.style.display = "block";
        m.style.zIndex = "9999";

        console.log("PROFILE:", e);

        m.innerHTML = `
            <span onclick="this.parentElement.style.display='none'" 
                  style="float:right;cursor:pointer;">✖</span>

            <h3>${e.Name || ""}</h3>

            <p><b>Emp No:</b> ${e["Emp No"] || ""}</p>
            <p><b>Grade:</b> ${e.currentGrade || ""}</p>

            <p><b>Unit:</b> ${e.Unit || ""}</p>
            <p><b>Department:</b> ${e.Department || ""}</p>

            ${e.Phone ? `<p><b>Phone:</b> ${e.Phone}</p>` : ""}
            ${e.Email ? `<p><b>Email:</b> ${e.Email}</p>` : ""}

            ${e.DOB ? `<p><b>DOB:</b> ${e.DOB}</p>` : ""}
            ${e.age ? `<p><b>Age:</b> ${e.age}</p>` : ""}

            ${e.exp ? `<p><b>Experience:</b> ${e.exp}</p>` : ""}
            ${e.DOJ ? `<p><b>DOJ:</b> ${e.DOJ}</p>` : ""}
        `;
    } catch(err){
        console.error("ERROR:", err);
        alert("Profile error - check console");
    }
}

function getDesignation(grade){
    const map = {
        E0: "Junior Engineer",
        E1: "Senior Engineer",
        E2: "Deputy Manager",
        E3: "Manager",
        E4: "Senior Manager",
        E5: "Chief Manager",
        E6: "Deputy General Manager",
        E7: "General Manager"
        E8: "Chief General Manager"
    };
    return map[grade] || grade;
}


function parseDate(d){
    if(!d) return null;

    d = d.replace(/\//g, "-");

    let p = d.split("-");
    if(p.length !== 3) return null;

    return new Date(p[2], p[1]-1, p[0]);
}


/* =========================================================
   PROMOTION HISTORY
========================================================= */

function createPromotionHistory(emp) {

    const entries = [];


    GRADES.forEach(
        (grade, index) => {

            const date =
                parseDate(
                    emp[grade]
                );


            if (!date) {
                return;
            }


            let label;


            if (index === 0) {

                label = "Entry to E0";

            }

            else {

                label =
                    `${GRADES[index - 1]} → ${grade}`;

            }


            entries.push(`
                <div class="timeline-row">

                    <div class="timeline-grade">
                        ${label}
                    </div>

                    <div class="timeline-dot"></div>

                    <div class="timeline-date">
                        ${formatDate(date)}
                    </div>

                </div>
            `);

        }
    );


    return entries.join("");

}



/* =========================================================
   PROMOTION STATUS
========================================================= */

function promotionStatusHTML(emp) {

    if (
        !emp.currentGradeDate
    ) {

        return "";

    }


    const eligible =
        emp.eligible === true;


    return `

        <section class="
            promotion-status-card
            ${
                eligible
                    ? "due"
                    : "notdue"
            }
        ">

            <div class="promotion-status-title">
                Promotion Status
            </div>


            <div class="status-grid">

                <div class="status-item">

                    <div class="status-label">
                        Last Promotion / Joining
                    </div>

                    <div class="status-value">
                        ${formatDate(
                            emp.currentGradeDate
                        )}
                    </div>

                </div>


                ${
                    emp.nextDueDate
                        ? `
                            <div class="status-item">

                                <div class="status-label">
                                    Next Promotion Due
                                </div>

                                <div class="status-value">
                                    ${formatDate(
                                        emp.nextDueDate
                                    )}
                                </div>

                            </div>
                        `
                        : ""
                }


                ${
                    emp.eligible !== null
                        ? `
                            <div class="status-item">

                                <div class="status-label">
                                    Eligible
                                </div>

                                <div class="status-value">
                                    ${
                                        emp.eligible
                                            ? "YES"
                                            : "NO"
                                    }
                                </div>

                            </div>
                        `
                        : ""
                }


                ${
                    emp.eligible
                        ? `
                            <div class="status-item">

                                <div class="status-label">
                                    Promotion Delay
                                </div>

                                <div class="status-value">
                                    ${formatMonths(
                                        emp.delayMonths
                                    )}
                                </div>

                            </div>
                        `
                        : ""
                }

            </div>

        </section>
    `;

}



/* =========================================================
   PROFILE HELPERS
========================================================= */

function infoSection(
    title,
    className,
    rows
) {

    if (!rows) {
        return "";
    }


    return `
        <section class="
            info-section
            ${className}
        ">

            <div class="section-heading">
                ${title}
            </div>

            <div class="info-body">
                ${rows}
            </div>

        </section>
    `;

}



function infoRow(
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return "";

    }


    return `
        <div class="info-row">

            <div class="info-label">
                ${escapeHTML(label)}
            </div>

            <div class="info-value">
                ${value}
            </div>

        </div>
    `;

}



/* =========================================================
   FILTER OPTIONS
========================================================= */

function createFilterOptions() {

    createCheckFilter(
        "unitFilter",
        uniqueValues(
            employees,
            "Unit"
        ),
        "unit"
    );


    createCheckFilter(
        "departmentFilter",
        uniqueValues(
            employees,
            "Department"
        ),
        "department"
    );


    createCheckFilter(
        "gradeFilter",
        GRADES.filter(
            grade =>
                employees.some(
                    emp =>
                        emp.currentGrade ===
                        grade
                )
        ),
        "grade"
    );


    createCheckFilter(
        "bloodFilter",
        uniqueValues(
            employees,
            "Blood Group"
        ),
        "blood"
    );

}



function uniqueValues(
    array,
    field
) {

    return [
        ...new Set(
            array
                .map(
                    item =>
                        item[field]
                )
                .filter(Boolean)
        )
    ]
    .sort(
        (a, b) =>
            a.localeCompare(b)
    );

}



function createCheckFilter(
    containerId,
    values,
    type
) {

    const container =
        document.getElementById(
            containerId
        );


    container.innerHTML =
        values
            .map(
                value => `
                    <label class="check-chip">

                        <input
                            type="checkbox"
                            data-filter="${type}"
                            value="${escapeAttribute(
                                value
                            )}"
                        >

                        <span>
                            ${escapeHTML(value)}
                        </span>

                    </label>
                `
            )
            .join("");

}



/* =========================================================
   FILTER APPLY / CLEAR
========================================================= */

function getCheckedValues(type) {

    return [
        ...document.querySelectorAll(
            `input[data-filter="${type}"]:checked`
        )
    ]
    .map(
        input =>
            input.value
    );

}



function applyFiltersFromPanel() {

    activeFilterState.units =
        getCheckedValues(
            "unit"
        );


    activeFilterState.departments =
        getCheckedValues(
            "department"
        );


    activeFilterState.grades =
        getCheckedValues(
            "grade"
        );


    activeFilterState.bloodGroups =
        getCheckedValues(
            "blood"
        );


    activeFilterState.eligible =
        document.getElementById(
            "eligibleFilter"
        ).value;


    activeFilterState.delay =
        document.getElementById(
            "delayFilter"
        ).value;


    activeFilterState.gradeYears =
        document.getElementById(
            "gradeYearsFilter"
        ).value;


    activeFilterState.experience =
        document.getElementById(
            "experienceFilter"
        ).value;


    closeFilters();

    updateDisplay();

}



function clearAllFilters() {

    document
        .querySelectorAll(
            ".filter-panel input[type='checkbox']"
        )
        .forEach(
            checkbox =>
                checkbox.checked = false
        );


    document.getElementById(
        "eligibleFilter"
    ).value = "";


    document.getElementById(
        "delayFilter"
    ).value = "";


    document.getElementById(
        "gradeYearsFilter"
    ).value = "";


    document.getElementById(
        "experienceFilter"
    ).value = "";


    Object.keys(
        activeFilterState
    )
    .forEach(key => {

        activeFilterState[key] =
            Array.isArray(
                activeFilterState[key]
            )
                ? []
                : "";

    });


    updateDisplay();

}



/* =========================================================
   ACTIVE FILTER CHIPS
========================================================= */

function renderActiveFilters() {

    const values = [

        ...activeFilterState.units,

        ...activeFilterState.departments,

        ...activeFilterState.grades,

        ...activeFilterState.bloodGroups

    ];


    if (
        activeFilterState.eligible
    ) {

        values.push(
            activeFilterState.eligible === "yes"
                ? "Eligible"
                : "Not Eligible"
        );

    }


    const container =
        document.getElementById(
            "activeFilters"
        );


    container.innerHTML =
        values
            .map(
                value => `
                    <span class="active-filter-chip">
                        ${escapeHTML(value)}
                    </span>
                `
            )
            .join("");


    const count =
        values.length +
        (
            activeFilterState.delay
                ? 1
                : 0
        ) +
        (
            activeFilterState.gradeYears
                ? 1
                : 0
        ) +
        (
            activeFilterState.experience
                ? 1
                : 0
        );


    const badge =
        document.getElementById(
            "filterCount"
        );


    if (count) {

        badge.textContent =
            count;

        badge.classList.remove(
            "hidden"
        );

    }

    else {

        badge.classList.add(
            "hidden"
        );

    }

}



/* =========================================================
   FILTER PANEL OPEN / CLOSE
========================================================= */

function openFilters() {

    document
        .getElementById(
            "filterOverlay"
        )
        .classList
        .remove("hidden");


    document
        .getElementById(
            "filterPanel"
        )
        .classList
        .add("open");

}



function closeFilters() {

    document
        .getElementById(
            "filterOverlay"
        )
        .classList
        .add("hidden");


    document
        .getElementById(
            "filterPanel"
        )
        .classList
        .remove("open");

}



/* =========================================================
   PROFILE CLOSE
========================================================= */

function closeProfile() {

    document
        .getElementById(
            "profileOverlay"
        )
        .classList
        .add("hidden");


    document
        .getElementById(
            "profilePanel"
        )
        .classList
        .remove("open");

}



/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}



function escapeAttribute(value) {

    return escapeHTML(
        value
    );

}



/* =========================================================
   EVENTS
========================================================= */

document
    .getElementById(
        "searchBox"
    )
    .addEventListener(
        "input",
        updateDisplay
    );


document
    .getElementById(
        "sortSelect"
    )
    .addEventListener(
        "change",
        updateDisplay
    );


document
    .getElementById(
        "filterButton"
    )
    .addEventListener(
        "click",
        openFilters
    );


document
    .getElementById(
        "closeFilter"
    )
    .addEventListener(
        "click",
        closeFilters
    );


document
    .getElementById(
        "filterOverlay"
    )
    .addEventListener(
        "click",
        closeFilters
    );


document
    .getElementById(
        "applyFilters"
    )
    .addEventListener(
        "click",
        applyFiltersFromPanel
    );


document
    .getElementById(
        "clearFilters"
    )
    .addEventListener(
        "click",
        clearAllFilters
    );


document
    .getElementById(
        "profileOverlay"
    )
    .addEventListener(
        "click",
        closeProfile
    );
