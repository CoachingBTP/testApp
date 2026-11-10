sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter"
], function (Controller, JSONModel, Filter) {
	"use strict";

	// Controller della pagina. Il nome deve coincidere con controllerName in App.view.xml.
	return Controller.extend("com.ticketing.tasks.controller.App", {

		// Parte una sola volta, all'apertura della vista.
		onInit: function () {
			var oView = this.getView();
			// Lista vuota: la tabella e' gia' collegata a /tasks e si riempie dopo loadData.
			var oData = { tasks: [] };
			var oModel = new JSONModel(oData);

			// Stesso schema della tabella dei metodi: JSONModel + setModel.
			oView.setModel(oModel);
			// Secondo modello, solo per il menu "Persona responsabile".
			// La chiave vuota e' la voce "Tutte" e non filtra.
			oView.setModel(new JSONModel({
				people: [{ key: "", text: "Tutte" }]
			}), "filters");

			// Legge model/tasks.json e riempie /tasks.
			oModel.loadData(sap.ui.require.toUrl("com/ticketing/tasks/model/tasks.json"));
			// Quando il file e' arrivato, costruisce l'elenco delle persone.
			oModel.attachRequestCompleted(this._fillPeople, this);
		},

		// Ricerca: a ogni lettera richiama gli stessi filtri della tabella.
		onSearch: function () {
			this._applyFilters();
		},

		// Un filtro (descrizione, date, priorita', persona) e' cambiato.
		onFilterChange: function () {
			this._applyFilters();
		},

		// Svuota ricerca e filtri, poi mostra di nuovo tutti i task.
		onClear: function () {
			this.byId("searchField").setValue("");
			this.byId("filterDescription").setValue("");
			this.byId("filterStart").setValue("");
			this.byId("filterEnd").setValue("");
			this.byId("filterPriority").setSelectedKey("");
			this.byId("filterPerson").setSelectedKey("");
			this._applyFilters();
		},

		// Apre o chiude la sezione progetto sotto quel task. Non cambia pagina.
		onToggleDetail: function (oEvent) {
			var oCtx = oEvent.getSource().getBindingContext();
			var sPath = oCtx.getPath();
			var bAperto = oCtx.getProperty("expanded");
			oCtx.getModel().setProperty(sPath + "/expanded", !bAperto);
		},

		// Testo del pulsante: Approfondisci se chiuso, Chiudi se aperto.
		formatDetailButton: function (bAperto) {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			return oBundle.getText(bAperto ? "hideDetail" : "showDetail");
		},

		// La tabella ha finito di disegnare le righe: aggiorna "Visibili: N".
		onUpdateFinished: function (oEvent) {
			var iCount = oEvent.getParameter("total");
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			this.byId("countText").setText(oBundle.getText("resultCount", [iCount]));
		},

		// Da "2026-10-01" (formato del JSON) a "01/10/2026" (quello in tabella).
		formatDate: function (sIso) {
			if (!sIso) {
				return "";
			}
			var aParti = String(sIso).split("-");
			if (aParti.length !== 3) {
				return sIso;
			}
			return aParti[2] + "/" + aParti[1] + "/" + aParti[0];
		},

		// Colore della priorita': Alta rosso, Media arancione, Bassa verde.
		formatPriorityState: function (sPriorita) {
			if (sPriorita === "Alta") {
				return "Error";
			}
			if (sPriorita === "Media") {
				return "Warning";
			}
			if (sPriorita === "Bassa") {
				return "Success";
			}
			return "None";
		},

		// Legge i task e riempie il menu delle persone, senza nomi doppi.
		_fillPeople: function () {
			var aTask = this.getView().getModel().getProperty("/tasks") || [];
			var oVisti = {};
			var aPersone = [{ key: "", text: "Tutte" }];

			aTask.forEach(function (oTask) {
				if (oTask.responsible && !oVisti[oTask.responsible]) {
					oVisti[oTask.responsible] = true;
					aPersone.push({
						key: oTask.responsible,
						text: oTask.responsible
					});
				}
			});

			// "Tutte" resta in cima. Gli altri nomi vanno in ordine alfabetico italiano.
			aPersone.sort(function (a, b) {
				if (!a.key) {
					return -1;
				}
				if (!b.key) {
					return 1;
				}
				return a.text.localeCompare(b.text, "it");
			});

			this.getView().getModel("filters").setProperty("/people", aPersone);
		},

		// Applica insieme ricerca e filtri. Un task resta visibile solo se li rispetta tutti.
		// Un campo vuoto, o "Tutte", non filtra.
		_applyFilters: function () {
			var aFiltri = [];
			var sRicerca = this.byId("searchField").getValue().trim();
			var sDescrizione = this.byId("filterDescription").getValue().trim();
			var sInizio = this.byId("filterStart").getValue();
			var sFine = this.byId("filterEnd").getValue();
			var sPriorita = this.byId("filterPriority").getSelectedKey();
			var sPersona = this.byId("filterPerson").getSelectedKey();

			// La ricerca guarda solo se la descrizione contiene il testo.
			if (sRicerca) {
				aFiltri.push(this._filtroContiene("description", sRicerca));
			}
			if (sDescrizione) {
				aFiltri.push(this._filtroContiene("description", sDescrizione));
			}
			// Le date confrontano il giorno esatto (EQ = uguale).
			// Il valore e' anno-mese-giorno, come nel file JSON.
			if (sInizio) {
				aFiltri.push(new Filter("startDate", "EQ", sInizio));
			}
			if (sFine) {
				aFiltri.push(new Filter("endDate", "EQ", sFine));
			}
			if (sPriorita) {
				aFiltri.push(new Filter("priority", "EQ", sPriorita));
			}
			if (sPersona) {
				aFiltri.push(new Filter("responsible", "EQ", sPersona));
			}

			// Lista vuota = nessun filtro = tutti i task.
			this.byId("tasksTable").getBinding("items").filter(aFiltri);
		},

		// Vero se il campo contiene il testo, senza distinguere maiuscole e minuscole.
		_filtroContiene: function (sCampo, sTesto) {
			var sQuery = sTesto.toLowerCase();
			return new Filter({
				path: sCampo,
				test: function (sValore) {
					return String(sValore || "").toLowerCase().indexOf(sQuery) !== -1;
				}
			});
		}
	});
});
