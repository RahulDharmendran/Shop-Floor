sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent"
], function (Controller, MessageToast, UIComponent) {
    "use strict";

    // Hardcoded global variable 'sLoggedInUser' is REMOVED.

    return Controller.extend("shopfloor.controller.Dashboard", {

        onInit: function () {
            // Get router and attach event handler to capture parameters when this route is navigated to
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteDashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            // 🌟 STEP: Retrieve the userId parameter from the route arguments
            var oArgs = oEvent.getParameter("arguments");
            // Store the User ID for use in all navigation handlers
            this._sLoggedInUser = oArgs.userId;

            // Handle scenario where userId might be missing (e.g., direct access)
            if (!this._sLoggedInUser) {
                MessageToast.show("Warning: User ID not provided on navigation.");
                // Optionally force a redirect to login if user ID is mandatory
            }
        },

        // Helper to navigate to OrderList with Mode (Month/Year)
        _navigateToOrderList: function (sEntitySet, sCreatorField, sMode) {

            // Construct a basic filter for the user ID
            // The OrderList controller will handle the rest based on 'mode'
            var sUserFilter = sCreatorField + " eq '" + (this._sLoggedInUser || "") + "'";

            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("OrderList", {
                orderType: sEntitySet,
                mode: sMode, // Pass the mode (Month or Year)
                filter: encodeURIComponent(sUserFilter)
            });
        },

        // --- Navigation Handlers (Updated to use this._sLoggedInUser) ---

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteLogin");
        },

        // Planned Orders
        onPressPlannedMonth: function () {
            this._navigateToOrderList("ZRD_SF_PLANNEDSet", "Creator", "Month");
        },

        onPressPlannedYear: function () {
            this._navigateToOrderList("ZRD_SF_PLANNEDSet", "Creator", "Year");
        },

        // Production Orders
        onPressProdMonth: function () {
            this._navigateToOrderList("ZRD_SF_PRODUCTIONSet", "Ernam", "Month");
        },

        onPressProdYear: function () {
            this._navigateToOrderList("ZRD_SF_PRODUCTIONSet", "Ernam", "Year");
        }
    });
});