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

        // Helper to build date filter string
        _buildDateFilter: function (sDateField, sYear, sMonth) {
            // Assume sYear is always available or default to current year
            var iYear = parseInt(sYear) || new Date().getFullYear();

            var sStartDate, sEndDate;

            if (sMonth !== null && sMonth !== undefined) {
                // Month Filter
                var iMonth = parseInt(sMonth);
                var oStartDate = new Date(Date.UTC(iYear, iMonth, 1));
                var oEndDate = new Date(Date.UTC(iYear, iMonth + 1, 0, 23, 59, 59));

                sStartDate = oStartDate.toISOString().split('.')[0]; // 2025-06-01T00:00:00
                sEndDate = oEndDate.toISOString().split('.')[0];
            } else {
                // Year Filter
                sStartDate = iYear + "-01-01T00:00:00";
                sEndDate = iYear + "-12-31T23:59:59";
            }

            // OData DateTime format: datetime'2025-06-01T00:00:00'
            return " and " + sDateField + " ge datetime'" + sStartDate + "' and " + sDateField + " le datetime'" + sEndDate + "'";
        },

        // Generic function to navigate and pass filter parameters (Simplified)
        _navigateToOrderList: function (sEntitySet, sFilter) {

            MessageToast.show("Applying Filter: " + sFilter);

            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("OrderList", {
                orderType: sEntitySet,
                filter: encodeURIComponent(sFilter)
            });
        },

        // --- Navigation Handlers (Updated to use this._sLoggedInUser) ---

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteLogin");
        },

        // Planned uses 'Creator'
        onPressPlannedMonth: function () {
            var sMonth = this.byId("slPlannedMonth").getSelectedKey();
            var sYear = this.byId("slPlannedYear").getSelectedKey();

            var sDateFilter = this._buildDateFilter("StartDate", sYear, sMonth);

            // Prepend User Filter (Essential for OrderList controller logic)
            var sFullFilter = "Creator eq '" + (this._sLoggedInUser || "") + "'" + sDateFilter;

            this._navigateToOrderList("ZRD_SF_PLANNEDSet", sFullFilter);
        },

        onPressPlannedYear: function () {
            var sYear = this.byId("slPlannedYear").getSelectedKey();

            var sDateFilter = this._buildDateFilter("StartDate", sYear, null); // Pass null for month to filter by entire year

            var sFullFilter = "Creator eq '" + (this._sLoggedInUser || "") + "'" + sDateFilter;

            this._navigateToOrderList("ZRD_SF_PLANNEDSet", sFullFilter);
        },

        // Production uses 'Ernam'
        onPressProdMonth: function () {
            var sMonth = this.byId("slProdMonth").getSelectedKey();
            var sYear = this.byId("slProdYear").getSelectedKey();

            // Production uses Gstrp
            var sDateFilter = this._buildDateFilter("Gstrp", sYear, sMonth);

            var sFullFilter = "Ernam eq '" + (this._sLoggedInUser || "") + "'" + sDateFilter;

            this._navigateToOrderList("ZRD_SF_PRODUCTIONSet", sFullFilter);
        },

        // Production uses 'Ernam'
        onPressProdYear: function () {
            var sYear = this.byId("slProdYear").getSelectedKey();

            var sDateFilter = this._buildDateFilter("Gstrp", sYear, null);

            var sFullFilter = "Ernam eq '" + (this._sLoggedInUser || "") + "'" + sDateFilter;

            this._navigateToOrderList("ZRD_SF_PRODUCTIONSet", sFullFilter);
        }
    });
});