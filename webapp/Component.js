sap.ui.define([
	"sap/ui/core/UIComponent"
], function (UIComponent) {
	"use strict";

	// Componente principale. UIComponent.extend e' lo schema della tabella dei metodi.
	// Non c'e' un router: l'app e' una sola pagina, quindi non servono getRouter e navTo.
	return UIComponent.extend("com.ticketing.tasks.Component", {
		metadata: {
			// Legge nome, vista iniziale, testi i18n e css da manifest.json.
			manifest: "json"
		},

		// Avvio del componente: esegue l'init standard di SAPUI5.
		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
		}
	});
});
