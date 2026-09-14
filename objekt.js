(function(){
  var id = new URLSearchParams(location.search).get("id");
  var title = document.getElementById("xt");
  var box = document.getElementById("xg");
  fetch("/listings.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():[]}).then(function(list){
    var item = (list||[]).filter(function(x){return x.id===id})[0] || (list&&list[0]);
    if(!item){ title.textContent="Kein Objekt"; return; }
    title.textContent = item.title || "Objekt";
    var imgs = (item.images||[]).map(function(s){return '<img src="'+s+'" alt="" style="width:100%;max-height:420px;object-fit:cover;margin-bottom:8px">'}).join("");
    box.innerHTML = imgs + "<p>"+[item.place,item.area?item.area+" m²":"",item.rooms?item.rooms+" Zi.":"",item.price].filter(Boolean).join(" · ")+"</p><p>"+(item.note||"")+"</p>";
    var place = document.querySelector('[name=place]');
    if(place && item.title) place.value = item.title;
  });
})();