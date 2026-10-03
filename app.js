const csvUrl = "https://raw.githubusercontent.com/debajitd1292/exec.0813/main/data.csv";

let employees = [];
let filteredEmployees = [];

fetch(csvUrl)
.then(res => res.text())
.then(data => {
    employees = parseCSV(data);
    employees.forEach(e => enrichData(e));
    filteredEmployees = [...employees];
    applyDefaultFilter();
    renderList(filteredEmployees);
});

function parseCSV(data){
    let rows = data.trim().split("\n");
    let headers = rows[0].split(",");

    return rows.slice(1).map(r=>{
        let values = r.split(",");
        let obj = {};
        headers.forEach((h,i)=> obj[h.trim()] = values[i]?.trim());
        return obj;
    });
}

function enrichData(e){
    let grades = ["E0","E1","E2","E3","E4","E5","E6","E7"];

    let currentGrade = null;
    let currentDate = null;

    grades.forEach(g=>{
        if(e[g]){
            currentGrade = g;
            currentDate = parseDate(e[g]);
        }
    });

    if(!currentDate){
        currentDate = parseDate(e.DOJ);
        currentGrade = "E0";
    }

    e.currentGrade = currentGrade;
    e.currentDate = currentDate;

    e.nextDue = addYears(currentDate,4);
    e.eligible = new Date() >= e.nextDue;

    e.delay = e.eligible ? diffDate(e.nextDue,new Date()) : null;
    e.exp = diffDate(parseDate(e.DOJ), new Date());
    e.age = diffDate(parseDate(e.DOB), new Date());
    e.gradeYears = diffDate(currentDate,new Date());
}

function renderList(data){
    const list = document.getElementById("list");
    list.innerHTML = "";

    data.forEach(e=>{
        let div = document.createElement("div");
        div.className = "card";

        let status = e.eligible ? "status-red" : "status-green";

        div.innerHTML = `
            <b>${e.Name}</b> (${e["Emp No"]})<br>
            ${e.Designation}<br>
            <span class="grade">${e.currentGrade}</span> | ${e.Department}<br>
            <span class="${status}">
                ${e.eligible ? "Eligible" : "Not Due"}
            </span>
        `;

        div.onclick = ()=> showProfile(e);
        list.appendChild(div);
    });
}

function showProfile(e){
    const m = document.getElementById("profileModal");
    m.style.display = "block";

    m.innerHTML = `
        <h3>${e.Name}</h3>
        <p><b>Emp No:</b> ${e["Emp No"]}</p>
        <p><b>Designation:</b> ${e.Designation}</p>
        <p><b>Grade:</b> ${e.currentGrade}</p>
        <p><b>Unit:</b> ${e.Unit}</p>
        <p><b>Department:</b> ${e.Department}</p>

        ${e.Phone ? `<p><b>Phone:</b> <a href="tel:${e.Phone}">${e.Phone}</a></p>` : ""}
        ${e.Email ? `<p><b>Email:</b> ${e.Email}</p>` : ""}

        <p><b>DOB:</b> ${e.DOB}</p>
        <p><b>Age:</b> ${e.age}</p>
        <p><b>Experience:</b> ${e.exp}</p>

        <p><b>DOJ:</b> ${e.DOJ}</p>
        <p><b>Years in Grade:</b> ${e.gradeYears}</p>

        <h4>Promotion Status</h4>
        <p>Last Promotion: ${formatDate(e.currentDate)}</p>
        <p>Next Due: ${formatDate(e.nextDue)}</p>
        <p>Eligible: ${e.eligible ? "YES" : "NO"}</p>
        <p>Delay: ${e.delay || "Not due yet"}</p>
    `;
}

function applyDefaultFilter(){
    filteredEmployees = employees.filter(e => e.Unit === "PPU");
    sortBySeniority(filteredEmployees);
}

function sortBySeniority(arr){
    const gradeOrder = ["E0","E1","E2","E3","E4","E5","E6","E7"];

    arr.sort((a,b)=>{
        let g1 = gradeOrder.indexOf(a.currentGrade);
        let g2 = gradeOrder.indexOf(b.currentGrade);

        if(g1 !== g2) return g2 - g1;

        if(a.currentDate - b.currentDate !== 0)
            return a.currentDate - b.currentDate;

        return Number(a["Emp No"]) - Number(b["Emp No"]);
    });
}

function parseDate(d){
    let [day,mon,yr] = d.split("-");
    return new Date(yr, mon-1, day);
}

function addYears(date, yrs){
    let d = new Date(date);
    d.setFullYear(d.getFullYear()+yrs);
    return d;
}

function diffDate(d1,d2){
    let months = (d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth());
    let years = Math.floor(months/12);
    months = months % 12;
    return `${years}y ${months}m`;
}

function formatDate(d){
    return d.toLocaleDateString("en-GB");
}
