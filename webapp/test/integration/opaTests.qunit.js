/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["shopfloor/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
