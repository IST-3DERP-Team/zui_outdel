sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
     function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";
        
        var _this;
        var _oCaption = {};
        var _startUpInfo;
        var _oHeader = {};

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
        var sapTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"}); //sap.ui.core.format.DateFormat.getDateInstance({pattern : "PThh'H'mm'M'ss'S'"});

        return Controller.extend("zuioutdel.controller.InterplantTransferDC", {
            onInit: function () {
                _this = this;
                _this.showLoadingDialog("Loading...");

                this._aColumns = {};
                this.getCaption();
                this.getColumns();

                // Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteInterplantTransferDC").attachPatternMatched(this._routePatternMatched, this);
            },

            _routePatternMatched: function (oEvent) {
                this.getView().setModel(new JSONModel({
                    activeSbu: oEvent.getParameter("arguments").sbu,
                    activeDlvNo: oEvent.getParameter("arguments").dlvNo,
                    editModeHeader: false
                }), "ui");

                // Get Resources
                var sbu = oEvent.getParameter("arguments").sbu;

                this.getResources("PlantSet", "issPlant", "SBU eq '" + sbu + "' and DCIND eq 'X'");
                this.getResources("PlantSet", "rcvPlant", "SBU eq '" + sbu + "' and DCIND eq ''");
                this.getResources("ShipModeSet", "shipMode", "");

                _this.initializeComponent();
            },

            initializeComponent() {
                var oModelStartUp= new sap.ui.model.json.JSONModel();
                oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                    _startUpInfo = oModelStartUp.oData
                    console.log(oModelStartUp, oModelStartUp.oData);
                });

                _oHeader = {
                    dlvNo: "",
                    mvtType: "",
                    status: "",
                    docDt: "",
                    reqDt: "",
                    postDt: "",
                    actIssDt: "",

                    issPlant: "",
                    issSloc: "",
                    rcvPlant: "",
                    rcvSloc: "",
                    etd: "",
                    eta: "",
                    shipMode: "",

                    vessel: "",
                    containerNo: "",
                    hbl: "",
                    mbl: "",
                    noPack: "",
                    createdBy: "",
                    createdDt: "",

                    forwarder: "",
                    carrier: "",
                    refDocNo: "",
                    refDocDt: "",
                    deleted: false,
                    updatedBy: "",
                    updatedDt: ""
                }

                setTimeout(() => {
                    _this.onChangeHeader();
                }, 1000);
                
                _this.closeLoadingDialog();
            },

            getColumns: async function() {
                var oModelColumns = new JSONModel();
                var sPath = jQuery.sap.getModulePath("zuioutdel", "/model/columns.json")
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "OUTDELDLVDTLHUMOD", "ZDV_OUTDELDLVHU");
                    
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "OUTDELDLVDTLMOD", "ZDV_OUTDELDLV");
                    }, 100);

                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "OUTDELSTATOVWMOD", "ZDV_OUTDELSTAT");
                    }, 100);

                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "OUTDELMATDOCMOD", "ZDV_OUTDELDOC");
                    }, 100);
                })
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;

                var oJSONColumnsModel = new JSONModel();
                var vSBU = this.getView().getModel("ui").getData().activeSbu;
                console.log("getDynamicColumns", arg1, arg2, arg3, vSBU)
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);

                        if (oData.results.length > 0) {
                            if (modCode === 'OUTDELDLVDTLHUMOD') {
                                var aColumns = _this.setTableColumns(oColumns["dlvDtlHU"], oData.results);                      
                                _this._aColumns["dlvDtlHU"] = aColumns["columns"];
                                _this.addColumns(_this.byId("dlvDtlHUTab"), aColumns["columns"], "dlvDtlHU");
                            }
                            else if (modCode === 'OUTDELDLVDTLMOD') {
                                var aColumns = _this.setTableColumns(oColumns["dlvDtl"], oData.results);                         
                                _this._aColumns["dlvDtl"] = aColumns["columns"];
                                _this.addColumns(_this.byId("dlvDtlTab"), aColumns["columns"], "dlvDtl");
                            }
                            else if (modCode === 'OUTDELSTATOVWMOD') {
                                var aColumns = _this.setTableColumns(oColumns["statOvw"], oData.results);                         
                                _this._aColumns["statOvw"] = aColumns["columns"];
                                _this.addColumns(_this.byId("statOvwTab"), aColumns["columns"], "statOvw");
                            }
                            else if (modCode === 'OUTDELMATDOCMOD') {
                                var aColumns = _this.setTableColumns(oColumns["matDoc"], oData.results);                         
                                _this._aColumns["matDoc"] = aColumns["columns"];
                                _this.addColumns(_this.byId("matDocTab"), aColumns["columns"], "matDoc");
                            }
                        }
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                var oColumn = (arg1 ? arg1 : []);
                var oMetadata = arg2;
                
                var aColumns = [];

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Creatable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    //columns
                    aColumns.push({
                        name: prop.ColumnName, 
                        label: vName, 
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'px',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
                })

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                var aColumnProp = aColumns.filter(item => item.showable === true);

                return { columns: aColumns };
            },

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            },

            onChangeHeader() {
                // Set Placeholder
                if (!this.byId("cmbIssPlant").getSelectedKey()) {
                    this.byId("cmbIssSloc").setPlaceholder(_oCaption.ISSPLANT + " is required.");
                } else {
                    this.byId("cmbIssSloc").setPlaceholder("");
                }

                if (!this.byId("cmbRcvPlant").getSelectedKey()) {
                    this.byId("cmbRcvSloc").setPlaceholder(_oCaption.RCVPLANT + " is required.");
                } else {
                    this.byId("cmbRcvSloc").setPlaceholder("");
                }

                if (_this.getView().getModel("ui").getData().activeDlvNo == "empty") _this.onAddHeader();
                else _this.onEditHeader();
            },

            onAddHeader() {
                var sCurrentDate = sapDateFormat.format(new Date());

                // Set header values
                _this.byId("iptDlvNo").setValue("");
                _this.byId("iptMvtType").setValue("");
                _this.byId("iptStatus").setValue("");
                _this.byId("dpDocDt").setValue(sCurrentDate);
                _this.byId("dpReqDt").setValue(sCurrentDate);
                _this.byId("dpPostDt").setValue(sCurrentDate);
                _this.byId("dpActIssDt").setValue(sCurrentDate);

                _this.byId("cmbIssPlant").setSelectedKey("");
                _this.byId("cmbIssSloc").setSelectedKey("");
                _this.byId("cmbRcvPlant").setSelectedKey("");
                _this.byId("cmbRcvSloc").setSelectedKey("");
                _this.byId("dpETD").setValue("");
                _this.byId("dpETA").setValue("");
                _this.byId("cmbShipMode").setSelectedKey("");

                _this.byId("iptVessel").setValue("");
                _this.byId("iptContainerNo").setValue("");
                _this.byId("iptHBL").setValue("");
                _this.byId("iptMBL").setValue("");
                _this.byId("iptNoPack").setValue("");
                _this.byId("iptCreatedBy").setValue(_startUpInfo.id);
                _this.byId("iptCreatedDt").setValue(sCurrentDate);

                _this.byId("iptForwarder").setValue("");
                _this.byId("iptCarrier").setValue("");
                _this.byId("iptRefDocNo").setValue("");
                _this.byId("dpRefDocDt").setValue("");
                _this.byId("chkDeleted").setSelected(false);
                _this.byId("iptUpdatedBy").setValue("");
                _this.byId("iptUpdatedDt").setValue("");

                this.setControlEditMode("header", true)
            },

            onEditHeader() {
                var sCurrentDate = sapDateFormat.format(new Date());
                var dlvNo = _this.getView().getModel("ui").getData().activeDlvNo;

                // Set header values
                _this.byId("iptDlvNo").setValue(dlvNo);
                _this.byId("iptMvtType").setValue("");
                _this.byId("iptStatus").setValue("");
                _this.byId("dpDocDt").setValue(sCurrentDate);
                _this.byId("dpReqDt").setValue(sCurrentDate);
                _this.byId("dpPostDt").setValue(sCurrentDate);
                _this.byId("dpActIssDt").setValue(sCurrentDate);

                _this.byId("cmbIssPlant").setSelectedKey("");
                _this.byId("cmbIssSloc").setSelectedKey("");
                _this.byId("cmbRcvPlant").setSelectedKey("");
                _this.byId("cmbRcvSloc").setSelectedKey("");
                _this.byId("dpETD").setValue("");
                _this.byId("dpETA").setValue("");
                _this.byId("cmbShipMode").setSelectedKey("");

                _this.byId("iptVessel").setValue("");
                _this.byId("iptContainerNo").setValue("");
                _this.byId("iptHBL").setValue("");
                _this.byId("iptMBL").setValue("");
                _this.byId("iptNoPack").setValue("");
                _this.byId("iptCreatedBy").setValue(_startUpInfo.id);
                _this.byId("iptCreatedDt").setValue(sCurrentDate);

                _this.byId("iptForwarder").setValue("");
                _this.byId("iptCarrier").setValue("");
                _this.byId("iptRefDocNo").setValue("");
                _this.byId("dpRefDocDt").setValue("");
                _this.byId("chkDeleted").setSelected("");
                _this.byId("iptUpdatedBy").setValue("");
                _this.byId("iptUpdatedDt").setValue("");

                this.setControlEditMode("header", true)
            },

            onSaveHeader() {
                // Validation
                var sErrMsg = "";

                if (!this.byId("cmbDocType").getSelectedKey()) sErrMsg = _oCaption.DOCTYPE;
                else if (!this.byId("cmbPurchOrg").getSelectedKey()) sErrMsg = _oCaption.PURCHORG;
                else if (!this.byId("cmbVendor").getSelectedKey()) sErrMsg = _oCaption.VENDOR;
                else if (!this.byId("cmbPurchGrp").getSelectedKey()) sErrMsg = _oCaption.PURCHGRP;
                else if (!this.byId("cmbCompany").getSelectedKey()) sErrMsg = _oCaption.COMPANY;
                else if (!this.byId("cmbPurchPlant").getSelectedKey()) sErrMsg = _oCaption.PURCHPLANT;
                else if (!this.byId("cmbShipToPlant").getSelectedKey()) sErrMsg = _oCaption.SHIPTOPLANT;
                else if (!this.byId("cmbIncoTerms").getSelectedKey()) sErrMsg = _oCaption.INCOTERMS;
                else if (!this.byId("cmbPayTerms").getSelectedKey()) sErrMsg = _oCaption.PAYTERMS;
                else if (!this.byId("iptDestination").getValue()) sErrMsg = _oCaption.DESTINATION;
                else if (!this.byId("cmbShipMode").getSelectedKey()) sErrMsg = _oCaption.SHIPMODE;

                if (sErrMsg.length > 0) {
                    sErrMsg += " is required."
                    sap.m.MessageBox.warning(sErrMsg);
                    return;
                }

                _oHeader.docType = this.byId("cmbDocType").getSelectedKey();
                _oHeader.purchOrg = this.byId("cmbPurchOrg").getSelectedKey();
                _oHeader.vendor = this.byId("cmbVendor").getSelectedKey();
                _oHeader.purchGrp = this.byId("cmbPurchGrp").getSelectedKey();
                _oHeader.company = this.byId("cmbCompany").getSelectedKey();
                _oHeader.purchPlant = this.byId("cmbPurchPlant").getSelectedKey();
                _oHeader.shipToPlant = this.byId("cmbShipToPlant").getSelectedKey();
                _oHeader.incoTerms = this.byId("cmbIncoTerms").getSelectedKey();
                _oHeader.currency = this.byId("iptCurrency").getValue();
                _oHeader.payTerms = this.byId("cmbPayTerms").getSelectedKey();
                _oHeader.destination = this.byId("iptDestination").getValue();
                _oHeader.shipMode = this.byId("cmbShipMode").getSelectedKey();

                this.getResources("VPOManualTaxSet", "taxCode", "PURCHORG eq '" + _oHeader.purchOrg + "' and VENDORCD eq '" + _oHeader.vendor + "'")
                this.getResources("VPOManualZCheckSet", "glAccount", "SBU eq '" + _sbu + "' and FIELD1 eq 'GLACCT' and FIELD2 eq '" + _oHeader.shipToPlant + "'");
                this.getResources("VPOManualZCheckSet", "acctAssCat", "SBU eq '" + _sbu + "' and FIELD1 eq '" + _oHeader.docType + "' and FIELD2 eq 'ACCTASS'");

                this.getDiscRate();
                this.setControlEditMode("header", false);
            },

            onCancelHeader() {
                sap.m.MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            _this.setControlEditMode("header", false)

                            // Set header values
                            _this.byId("iptDlvNo").setValue(_oHeader.dlvNo);
                            _this.byId("iptMvtType").setValue(_oHeader.mvtType);
                            _this.byId("iptStatus").setValue(_oHeader.status);
                            _this.byId("dpDocDt").setValue(_oHeader.docDt);
                            _this.byId("dpReqDt").setValue(_oHeader.reqDt);
                            _this.byId("dpPostDt").setValue(_oHeader.postDt);
                            _this.byId("dpActIssDt").setValue(_oHeader.actIssDt);

                            _this.byId("cmbIssPlant").setSelectedKey(_oHeader.issPlant);
                            _this.byId("cmbIssSloc").setSelectedKey(_oHeader.issSloc);
                            _this.byId("cmbRcvPlant").setSelectedKey(_oHeader.rcvPlant);
                            _this.byId("cmbRcvSloc").setSelectedKey(_oHeader.rcvSloc);
                            _this.byId("dpETD").setValue(_oHeader.etd);
                            _this.byId("dpETA").setValue(_oHeader.eta);
                            _this.byId("cmbShipMode").setSelectedKey(_oHeader.shipMode);

                            _this.byId("iptVessel").setValue(_oHeader.vessel);
                            _this.byId("iptContainerNo").setValue(_oHeader.containerNo);
                            _this.byId("iptHBL").setValue(_oHeader.hbl);
                            _this.byId("iptMBL").setValue(_oHeader.mbl);
                            _this.byId("iptNoPack").setValue(_oHeader.noPack);
                            _this.byId("iptCreatedBy").setValue(_oHeader.createdBy);
                            _this.byId("iptCreatedDt").setValue(_oHeader.createdDt);

                            _this.byId("iptForwarder").setValue(_oHeader.forwarder);
                            _this.byId("iptCarrier").setValue(_oHeader.carrier);
                            _this.byId("iptRefDocNo").setValue(_oHeader.refDocNo);
                            _this.byId("dpRefDocDt").setValue(_oHeader.refDocDt);
                            _this.byId("chkDeleted").setSelected(_oHeader.deleted);
                            _this.byId("iptUpdatedBy").setValue(_oHeader.updatedBy);
                            _this.byId("iptUpdatedDt").setValue(_oHeader.updatedDt);
        
                        }
                    }
                });
            },

            getResources(pEntitySet, pModel, pFilter) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/" + pEntitySet;
                var oFilter = (pFilter ? { "$filter": pFilter } : {} )

                oModel.read(oEntitySet, {
                    urlParameters: oFilter,
                    success: function (data, response) {
                        //console.log("getResources success", pModel, data, pFilter)
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, pModel);

                        if (pModel == "issSloc" && data.results.length > 0) {
                            if (data.results.length > 0) _this.byId("cmbIssSloc").setPlaceholder("");
                            else _this.byId("cmbIssSloc").setPlaceholder("No data for selected " + _oCaption.ISSPLANT);
                        } else if (pModel == "rcvSloc" && data.results.length > 0) {
                            if (data.results.length > 0) _this.byId("cmbRcvSloc").setPlaceholder("");
                            else _this.byId("cmbRcvSloc").setPlaceholder("No data for selected " + _oCaption.RCVPLANT);
                        }
                    },
                    error: function (err) {
                    }
                })
            },

            onDropdownSelectionChange(oEvent) {

                var oSource = oEvent.getSource();
                var oParameters = oEvent.getParameters();
                var sModel = oSource.mBindingInfos.items.model;
                var sKey = oSource.mProperties.selectedKey;
                var oSelectedItem = oParameters.selectedItem.mProperties;

                if (sModel == "issPlant") {
                    this.getResources("SLocSet", "issSloc", "PLANTCD eq '" + sKey + "'");
                } else if (sModel == "rcvPlant") {
                    this.getResources("SLocSet", "rcvSloc", "PLANTCD eq '" + sKey + "'");
                }
            },

            setReqField(pType, pEditable) {
                if (pType == "header") {
                    var fields = ["feDocDt", "feReqDt", "feIssPlant", "feIssSloc", "feRcvPlant", "feRcvSloc", "feShipMode"];

                    fields.forEach(id => {
                        if (pEditable) {
                            this.byId(id).setLabel("*" + this.byId(id).getLabel());
                            this.byId(id)._oLabel.addStyleClass("requiredField");
                        } else {
                            this.byId(id).setLabel(this.byId(id).getLabel().replaceAll("*", ""));
                            this.byId(id)._oLabel.removeStyleClass("requiredField");
                        }
                    })
                } else {
                    var oTable = this.byId(pType + "Tab");

                    oTable.getColumns().forEach((col, idx) => {
                        if (col.getLabel().getText().includes("*")) {
                            col.getLabel().setText(col.getLabel().getText().replaceAll("*", ""));
                        }

                        this._aColumns[pType].filter(item => item.label === col.getLabel().getText())
                            .forEach(ci => {
                                if (ci.required) {
                                    col.getLabel().removeStyleClass("requiredField");
                                }
                            })
                    })
                }
            },

            setControlEditMode(pType, pEditable) {
                //if (sap.ushell.Container) sap.ushell.Container.setDirtyFlag(pEditable);

                if (pType == "header") {
                    // Header
                    this.byId("btnEditHeader").setVisible(!pEditable);
                    this.byId("btnDeleteHeader").setVisible(!pEditable);
                    this.byId("btnPostHeader").setVisible(!pEditable);
                    this.byId("btnRefreshHeader").setVisible(!pEditable);
                    this.byId("btnPrintHeader").setVisible(!pEditable);
                    this.byId("btnSaveHeader").setVisible(pEditable);
                    this.byId("btnCancelHeader").setVisible(pEditable);

                    this.setReqField("header", pEditable);
                    this.getView().getModel("ui").setProperty("/editModeHeader", pEditable);

                    // Detail
                    this.byId("btnCreateDlvDtlHU").setEnabled(!pEditable);
                    this.byId("btnDeleteDlvDtlHU").setEnabled(!pEditable);
                    this.byId("btnRefreshDlvDtlHU").setEnabled(!pEditable);
                    this.byId("btnRefreshDlvDtl").setEnabled(!pEditable);
                    this.byId("btnRefreshStatOvw").setEnabled(!pEditable);
                    this.byId("btnRefreshMatDoc").setEnabled(!pEditable);
                } 
                // else if (pType == "detail") {
                //     // Header
                //     this.byId("btnCreateHeader").setEnabled(!pEditable);
                //     this.byId("btnEditHeader").setEnabled(!pEditable);
                //     this.byId("btnCloseHeader").setEnabled(!pEditable);

                //     // Detail
                //     this.byId("btnCreateDetail").setVisible(!pEditable);
                //     this.byId("btnEditDetail").setVisible(!pEditable);
                //     this.byId("btnDeleteDetail").setVisible(!pEditable);
                //     this.byId("btnAddRowDetail").setVisible(pEditable);
                //     this.byId("btnRemoveRowDetail").setVisible(pEditable);
                //     this.byId("btnSaveDetail").setVisible(pEditable);
                //     this.byId("btnCancelDetail").setVisible(pEditable);

                //     this.setReqField("detail", pEditable);
                //     if (!pEditable) this.setRowReadMode("detail");
                // } else {
                //     if (pType == "remarks") {

                //         this.byId("btnCreateRemarks").setVisible(!pEditable);
                //         this.byId("btnEditRemarks").setVisible(!pEditable);
                //         this.byId("btnDeleteRemarks").setVisible(!pEditable);
                //         this.byId("btnAddRowRemarks").setVisible(pEditable);
                //         this.byId("btnRemoveRowRemarks").setVisible(pEditable);
                //         this.byId("btnSaveRemarks").setVisible(pEditable);
                //         this.byId("btnCancelRemarks").setVisible(pEditable);

                //     } else if (pType == "packInstruct") {

                //         this.byId("btnCreatePackInstruct").setVisible(!pEditable);
                //         this.byId("btnEditPackInstruct").setVisible(!pEditable);
                //         this.byId("btnDeletePackInstruct").setVisible(!pEditable);
                //         this.byId("btnAddRowPackInstruct").setVisible(pEditable);
                //         this.byId("btnRemoveRowPackInstruct").setVisible(pEditable);
                //         this.byId("btnSavePackInstruct").setVisible(pEditable);
                //         this.byId("btnCancelPackInstruct").setVisible(pEditable);

                //     }

                //     // Remarks and Packing Instructions
                //     this.setReqField(pType, pEditable);
                //     if (!pEditable) this.setRowReadMode(pType);

                //     // Icon Tab Bar
                //     var oIconTabBar = this.byId("itbHeaderText");
                //     if (pEditable) {
                //         oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                //             .forEach(item => item.setProperty("enabled", false));
                //     } else {
                //         oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                //     }
                // }

                // Icon Tab Bar
                var oIconTabBar = this.byId("itbDetails");
                if (pEditable) {
                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", false));
                } else {
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
                }
            },

            showLoadingDialog(arg) {
                if (!_this._LoadingDialog) {
                    _this._LoadingDialog = sap.ui.xmlfragment("zuioutdel.view.fragments.LoadingDialog", _this);
                    _this.getView().addDependent(_this._LoadingDialog);
                } 
                
                _this._LoadingDialog.setTitle(arg);
                _this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                _this._LoadingDialog.close();
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Label
                oDDTextParam.push({CODE: "DLVNO"});
                oDDTextParam.push({CODE: "MVTTYPE"});
                oDDTextParam.push({CODE: "STATUS"});
                oDDTextParam.push({CODE: "DOCDT"});
                oDDTextParam.push({CODE: "REQDT"});
                oDDTextParam.push({CODE: "POSTDT"});
                oDDTextParam.push({CODE: "ACTISSDT"});

                oDDTextParam.push({CODE: "ISSPLANT"});
                oDDTextParam.push({CODE: "ISSSLOC"});
                oDDTextParam.push({CODE: "RCVPLANT"});
                oDDTextParam.push({CODE: "RCVSLOC"});
                oDDTextParam.push({CODE: "ETD"});
                oDDTextParam.push({CODE: "ETA"});
                oDDTextParam.push({CODE: "MODESHIP"});       
                
                oDDTextParam.push({CODE: "VESSEL"});
                oDDTextParam.push({CODE: "CONTAINERNO"});
                oDDTextParam.push({CODE: "HBL"});
                oDDTextParam.push({CODE: "MBL"});
                oDDTextParam.push({CODE: "NOPACK"});
                oDDTextParam.push({CODE: "CREATEDBY"});
                oDDTextParam.push({CODE: "CREATEDDT"});    

                oDDTextParam.push({CODE: "FORWARDER"});
                oDDTextParam.push({CODE: "CARRIER"});
                oDDTextParam.push({CODE: "REFDOCNO"});
                oDDTextParam.push({CODE: "REFDOCDT"});
                oDDTextParam.push({CODE: "DELETED"});
                oDDTextParam.push({CODE: "UPDATEDBY"});
                oDDTextParam.push({CODE: "UPDATEDDT"});

                // MessageBox
                // oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                // oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                // oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"});
                // oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                // oDDTextParam.push({CODE: "INFO_CREATE_DATA_NOT_ALLOW"});
                // oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                // oDDTextParam.push({CODE: "INFO_NO_DELETE_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_USE_GMC_REQ"});
                // oDDTextParam.push({CODE: "INFO_ALREADY_EXIST"});
                // oDDTextParam.push({CODE: "INFO_PROCEED_DELETE"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        console.log("CaptionMsgSet", oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "ddtext");

                        _oCaption = _this.getView().getModel("ddtext").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });