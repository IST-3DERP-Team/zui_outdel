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
        var _sHeaderMode = "";
        var _sNoRangeCd = "";

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
                    editModeHeader: false,
                    editModeHeader2: false
                }), "ui");

                // Get Resources
                var sbu = oEvent.getParameter("arguments").sbu;

                this.getResources("Status001Set", "status", "");
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
                    updatedDt: "",

                    dlvType: "",
                    whseCd: "",
                    storAreaCd: "",
                    statusDesc: "",
                    createdTm: "",
                    updatedTm: ""
                }

                _this.getView().setModel(new JSONModel({
                    results: []
                }), "dlvDtlHU");

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("dlvDtlHUTab").addEventDelegate(oTableEventDelegate);
                this.byId("dlvDtlTab").addEventDelegate(oTableEventDelegate);
                this.byId("statOvwTab").addEventDelegate(oTableEventDelegate);
                this.byId("matDocTab").addEventDelegate(oTableEventDelegate);

                setTimeout(() => {
                    _this.onChangeHeader();
                }, 1500);
                
                _this.closeLoadingDialog();
            },

            onKeyUp(oEvent) {
                if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    var sModel = "";
                    if (oTable.getId().indexOf("dlvDtlHUTab") >= 0) sModel = "dlvDtlHU";
                    else if (oTable.getId().indexOf("dlvDtlTab") >= 0) sModel = "dlvDtl";
                    else if (oTable.getId().indexOf("statOvwTab") >= 0) sModel = "statOvw";
                    else if (oTable.getId().indexOf("matDocTab") >= 0) sModel = "matDoc";

                    if (this.byId(oEvent.srcControl.sId).getBindingContext(sModel)) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext(sModel).sPath;

                        oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
            },

            onAfterTableRendering: function(oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    this._tableRendered = "";
                }
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
                
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        console.log("getDynamicColumns",modCode,oData)
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
                                oData.results.forEach(col => {
                                    if (col.ColumnName == "COMPLETE")
                                    col.DataType =  "BOOLEAN";
                                })

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

                if (_this.getView().getModel("ui").getData().activeDlvNo == "empty") {
                    _sHeaderMode = "NEW";
                    _this.onAddHeader()
                    //_this.getNumber();
                } else {
                    _sHeaderMode = "EDIT";
                    _this.getHeader();
                }
            },

            getHeader() {
                _this.showLoadingDialog("Loading...");

                var oModel = this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var sFilter = "DLVNO eq '" + sDlvNo + "'";

                oModel.read("/DlvHeaderTblSet", {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("DlvHeaderTblSet read", data);
                        var oDlvHdr = data.results[0];
                        _oHeader.dlvNo = oDlvHdr.DLVNO;
                        _oHeader.mvtType = oDlvHdr.BWART;
                        _oHeader.status = oDlvHdr.STATUSCD;
                        _oHeader.docDt = (oDlvHdr.DOCDT ? sapDateFormat.format(new Date(oDlvHdr.DOCDT)) : "");
                        _oHeader.reqDt = (oDlvHdr.PLANDLVDT ? sapDateFormat.format(new Date(oDlvHdr.PLANDLVDT)) : "");
                        _oHeader.postDt = (oDlvHdr.POSTDT ? sapDateFormat.format(new Date(oDlvHdr.POSTDT)) : "");
                        _oHeader.actIssDt = (oDlvHdr.ACTDLVDT ? sapDateFormat.format(new Date(oDlvHdr.ACTDLVDT)) : "");

                        _oHeader.issPlant = oDlvHdr.ISSPLNT;
                        _oHeader.issSloc = oDlvHdr.ISSSLOC;
                        _oHeader.rcvPlant = oDlvHdr.RCVPLNT;
                        _oHeader.rcvSloc = oDlvHdr.RCVSLOC;
                        _oHeader.etd = (oDlvHdr.ETD ? sapDateFormat.format(new Date(oDlvHdr.ETD)) : "");
                        _oHeader.eta = (oDlvHdr.ETA ? sapDateFormat.format(new Date(oDlvHdr.ETA)) : "");
                        _oHeader.shipMode = oDlvHdr.EVERS;

                        _oHeader.vessel = oDlvHdr.VESSEL;
                        _oHeader.containerNo = oDlvHdr.CONTNO;
                        _oHeader.hbl = oDlvHdr.HBL;
                        _oHeader.mbl = oDlvHdr.MBL;
                        _oHeader.noPack = oDlvHdr.TOTALPKG;
                        _oHeader.createdBy = oDlvHdr.CREATEDBY;
                        _oHeader.createdDt = (oDlvHdr.CREATEDDT ? sapDateFormat.format(new Date(oDlvHdr.CREATEDDT)) + " " + 
                            _this.formatTime(oDlvHdr.CREATEDTM) : "");
                        
                        _oHeader.forwarder = oDlvHdr.FORWRDR;
                        _oHeader.carrier = oDlvHdr.CARRIER;
                        _oHeader.refDocNo = oDlvHdr.REFDOC;
                        _oHeader.refDocDt = (oDlvHdr.REFDOCDT ? sapDateFormat.format(new Date(oDlvHdr.REFDOCDT)) : "");
                        _oHeader.deleted = (oDlvHdr.DELETED == "X" ? true : false);
                        _oHeader.updatedBy = oDlvHdr.UPDATEDBY;
                        _oHeader.updatedDt = (oDlvHdr.UPDATEDDT ? sapDateFormat.format(new Date(oDlvHdr.UPDATEDDT)) + " " +
                            _this.formatTime(oDlvHdr.UPDATEDTM) : "");

                        _oHeader.dlvType = oDlvHdr.DLVTYP;
                        _oHeader.whseCd = oDlvHdr.WHSECD;
                        _oHeader.storAreaCd = oDlvHdr.STORAREACD;
                        _oHeader.createdTm = oDlvHdr.CREATEDTM;
                        _oHeader.updatedTm = oDlvHdr.UPDATEDTM;

                        _this.getResources("SLocSet", "issSloc", "PLANTCD eq '" + _oHeader.issPlant + "'");
                        _this.getResources("SLocSet", "rcvSloc", "PLANTCD eq '" + _oHeader.rcvPlant + "'");

                        _this.getDlvDtlHU();
                        _this.getDlvDtl();
                        _this.getStatOvw();
                        _this.getMatDoc();

                        _this.setHeaderValue(true);
                        _this.setControlEditMode("header", false);
                        _this.closeLoadingDialog();
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                })
            },

            getNumber(pSaveParam) {
                var oModel = this.getOwnerComponent().getModel();
                var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oParamGetNumber = {};

                oParamGetNumber["N_GetNumberParam"] = [{
                    IUserid: _startUpInfo.id,
                    INorangecd: _sNoRangeCd,
                    IKeycd: ""
                }];
                oParamGetNumber["N_GetNumberReturn"] = [];

                oModelRFC.create("/GetNumberSet", oParamGetNumber, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        console.log("GetNumberSet", oResult, oResponse);

                        if (oResult.EReturnno.length > 0) {
                            _this.getView().getModel("ui").setProperty("/activeDlvNo", oResult.EReturnno);
                            _oHeader.dlvNo = oResult.EReturnno;

                            pSaveParam.DLVNO = _oHeader.dlvNo;
                            oModel.create("/DlvHeaderTblSet", pSaveParam, {
                                method: "POST",
                                success: function(data, oResponse) {
                                    console.log("DlvHeaderTbl create", data)
                                    sap.m.MessageBox.information(_oCaption.INFO_SAVE_SUCCESS);
                                    _this.getHeader();
                                },
                                error: function(err) {
                                    console.log("error", err)
                                    _this.closeLoadingDialog();
                                }
                            });
                        } else {
                            var sMessage = oResult.N_GetNumberReturn.results[0].Type + ' - ' + oResult.N_GetNumberReturn.results[0].Message;
                            sap.m.MessageBox.error(sMessage);
                        }
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                        _this.closeLoadingDialog();
                    }
                });
            },

            getDlvDtlHU() {
                var oModel = this.getOwnerComponent().getModel();
                var sDlvNo = _oHeader.dlvNo;

                var sFilter = "DLVNO eq '" + sDlvNo + "'";
                oModel.read('/DlvDetailHUSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("DlvDetailHUSet", data)

                        data.results.forEach(item => {

                            item.DELETED = item.DELETED === "X" ? true : false;

                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = sapDateFormat.format(item.CREATEDDT) + " " + _this.formatTime(item.CREATEDTM);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = sapDateFormat.format(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);
                        })

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvDtlHU");

                        _this.setRowReadMode("dlvDtlHU");

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getDlvDtl() {
                var oModel = _this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var sFilter = "DLVNO eq '" + sDlvNo + "'";

                oModel.read('/DlvDetailSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("DlvDetailSet", data)
                        data.results.forEach(item => {

                            item.DELETED = item.DELETED === "X" ? true : false;

                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = sapDateFormat.format(item.CREATEDDT) + " " + _this.formatTime(item.CREATEDTM);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = sapDateFormat.format(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);
                        })

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvDtl");

                        _this.setRowReadMode("dlvDtl");

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            getStatOvw() {
                var oModel = _this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var sFilter = "DLVNO eq '" + sDlvNo + "'";

                oModel.read('/StatOvwSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("StatOvwSet", data)
                        data.results.forEach(item => {
                            item.COMPLETE = item.COMPLETE === "X" ? true : false;

                            var oStatus = _this.getView().getModel("status").getData().results.filter(x => x.STATUS == item.DLVSTATCD)[0];
                            item.DLVSTATCD = item.DLVSTATCD + " - (" + oStatus.DESCRIP + ")";

                            if (item.STARTDT !== null)
                                item.STARTDT = sapDateFormat.format(item.STARTDT) + " " + _this.formatTime(item.STARTTM);

                            if (item.ENDDT !== null)
                                item.ENDDT = sapDateFormat.format(item.ENDDT) + " " + _this.formatTime(item.ENDTM);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = sapDateFormat.format(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);
                        });

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "statOvw");

                        _this.setRowReadMode("statOvw");

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            getMatDoc() {
                var oModel = _this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var sFilter = "DLVNO eq '" + sDlvNo + "'";

                oModel.read('/MatDocSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("MatDocSet", data)
                        data.results.forEach(item => {
                            if (item.DOCDT !== null)
                                    item.DOCDT = sapDateFormat.format(item.DOCDT);

                            if (item.POSTDT !== null)
                                item.POSTDT = sapDateFormat.format(item.POSTDT);
                        });

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "matDoc");

                        _this.setRowReadMode("matDoc");

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onAddHeader() {
                var oModel = this.getOwnerComponent().getModel();

                oModel.read('/DlvHeaderNewSet', {
                    success: function (data, response) {
                        console.log("DlvHeaderNewSet", data)
                        if (data.results.length > 0) {
                            _oHeader.dlvType = data.results[0].DLVTYPE;
                            _oHeader.mvtType = data.results[0].MVTTYPE;
                            _oHeader.status = data.results[0].STATUSCD;
                            _oHeader.statusDesc = data.results[0].STATUSDESC;
                            _sNoRangeCd = data.results[0].NORANGECD;

                            _this.setHeaderValue(false);
                            _this.setControlEditMode("header", true)
                        }
                    },
                    error: function (err) { 
                        console.log("error", err)
                    }
                })
            },

            onEditHeader() {
                if (_oHeader.status == "04") {
                    MessageBox.warning(_oCaption.WARN_EDIT_NOT_ALLOW);
                    return;
                }

                _this.setControlEditMode("header", true)
            },

            onDeleteHeader() {
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return;
                }

                if (_oHeader.status == "04") {
                    MessageBox.warning(_oCaption.WARN_DELETE_NOT_ALLOW);
                    return;
                }

                MessageBox.confirm(_oCaption.INFO_PROCEED_DELETE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction === "Yes") {
                            _this.showLoadingDialog("Deleting...");

                            var sEntitySet = "/DlvHeaderTblSet(DLVNO='" + _oHeader.dlvNo + "')";
                            var param = {
                                DELETED: "X"
                            };

                            var oModel = _this.getOwnerComponent().getModel();
                            console.log("onDeleteHeader param", sEntitySet, param)
                            oModel.update(sEntitySet, param, {
                                method: "PUT",
                                success: function(data, oResponse) {
                                    console.log(sEntitySet, data, oResponse);
                                    MessageBox.information(_oHeader.dlvNo + " is now deleted.")
                                    _this.onRefreshHeader();
                                },
                                error: function(err) {
                                    console.log("error", err)
                                    _this.closeLoadingDialog();
                                }
                            });
                        }
                    }
                });
            },

            onPostHeader() {
                if (_oHeader.status == "04") {
                    MessageBox.warning(_oCaption.WARN_NOT_STATUS_GR_POSTED);
                    _this.closeLoadingDialog();
                    return;
                }

                if (_this.getView().getModel("dlvDtlHU").getData().results.length == 0) {
                    MessageBox.warning(_oCaption.WARN_NO_DATA_DLVDTLHU);
                    _this.closeLoadingDialog();
                    return;
                }

                MessageBox.confirm(_oCaption.INFO_PROCEED_POST, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction === "Yes") {
                            _this.showLoadingDialog("Posting...");

                            var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                            var oParam = {};

                            oParam = {
                                iv_dlvno: _oHeader.dlvNo,
                                iv_userid: _startUpInfo.id,
                                N_POST901_RETURN: []
                            };

                            console.log("GoodsMvt_Post901Set param", oParam);
                            oModelRFC.create("/GoodsMvt_Post901Set", oParam, {
                                method: "POST",
                                success: function(oResult, oResponse) {
                                    console.log("GoodsMvt_Post901Set", oResult, oResponse);

                                    MessageBox.information(oResult.N_POST901_RETURN.results[0].Message);
                                    _this.closeLoadingDialog();
                                    _this.getHeader();
                                },
                                error: function(err) {
                                    sap.m.MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                    _this.closeLoadingDialog();
                                }
                            });
                        }
                    }
                });
            },

            onRefreshHeader() {
                _this.getHeader();
            },

            setHeaderValue(pWithValue) {
                if (pWithValue) {

                    _this.byId("iptDlvNo").setValue(_oHeader.dlvNo);
                    _this.byId("iptMvtType").setValue(_oHeader.mvtType);
                    _this.byId("cmbStatus").setSelectedKey(_oHeader.status);
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

                } else {
                    var sCurrentDate = sapDateFormat.format(new Date());

                    _this.byId("iptDlvNo").setValue(_oHeader.dlvNo);
                    _this.byId("iptMvtType").setValue(_oHeader.mvtType);
                    _this.byId("cmbStatus").setSelectedKey(_oHeader.status);
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
                    
                }
            },

            onSaveHeader() {
                // Validation
                var sErrMsg = "";

                if (!this.byId("dpDocDt").getValue()) sErrMsg = _oCaption.DOCDT;
                else if (!this.byId("dpReqDt").getValue()) sErrMsg = _oCaption.REQDT;
                else if (!this.byId("cmbIssPlant").getSelectedKey()) sErrMsg = _oCaption.ISSPLANT;
                else if (!this.byId("cmbIssSloc").getSelectedKey()) sErrMsg = _oCaption.ISSSLOC;
                else if (!this.byId("cmbRcvPlant").getSelectedKey()) sErrMsg = _oCaption.RCVPLANT;
                else if (!this.byId("cmbRcvSloc").getSelectedKey()) sErrMsg = _oCaption.RCVSLOC;
                else if (!this.byId("cmbShipMode").getSelectedKey()) sErrMsg = _oCaption.MODESHIP;

                if (sErrMsg.length > 0) {
                    sErrMsg += " is required."
                    MessageBox.warning(sErrMsg);
                    return;
                }

                var oModel = this.getOwnerComponent().getModel();

                var param = {
                    DLVNO: _this.byId("iptDlvNo").getValue(),
                    BWART: _this.byId("iptMvtType").getValue(),
                    STATUSCD: _oHeader.status,
                    
                    ISSPLNT: _this.byId("cmbIssPlant").getSelectedKey(),
                    ISSSLOC: _this.byId("cmbIssSloc").getSelectedKey(),
                    RCVPLNT: _this.byId("cmbRcvPlant").getSelectedKey(),
                    RCVSLOC: _this.byId("cmbRcvSloc").getSelectedKey(),
                    EVERS: _this.byId("cmbShipMode").getSelectedKey(),

                    VESSEL: _this.byId("iptVessel").getValue(),
                    CONTNO: _this.byId("iptContainerNo").getValue(),
                    HBL: _this.byId("iptHBL").getValue(),
                    MBL: _this.byId("iptMBL").getValue(),
                    TOTALPKG: (_this.byId("iptNoPack").getValue() ? parseInt(_this.byId("iptNoPack").getValue()) : 0),

                    FORWRDR: _this.byId("iptForwarder").getValue(),
                    CARRIER: _this.byId("iptCarrier").getValue(),
                    REFDOC: _this.byId("iptRefDocNo").getValue(),                    

                    DLVTYP: _oHeader.dlvType,
                    WHSECD: _oHeader.whseCd,
                    STORAREACD: _oHeader.storAreaCd
                }

                // Insert date if has value
                if (_this.byId("dpDocDt").getValue()) 
                    param.DOCDT = sapDateFormat.format(new Date(_this.byId("dpDocDt").getValue())) + "T00:00:00";
                if (_this.byId("dpReqDt").getValue()) 
                    param.PLANDLVDT = sapDateFormat.format(new Date(_this.byId("dpReqDt").getValue())) + "T00:00:00";
                if (_this.byId("dpPostDt").getValue()) 
                    param.POSTDT = sapDateFormat.format(new Date(_this.byId("dpPostDt").getValue())) + "T00:00:00";
                if (_this.byId("dpActIssDt").getValue()) 
                    param.ACTDLVDT = sapDateFormat.format(new Date(_this.byId("dpActIssDt").getValue())) + "T00:00:00";
                if (_this.byId("dpETD").getValue()) 
                    param.ETD = sapDateFormat.format(new Date(_this.byId("dpETD").getValue())) + "T00:00:00";
                if (_this.byId("dpETA").getValue()) 
                    param.ETA = sapDateFormat.format(new Date(_this.byId("dpETA").getValue())) + "T00:00:00";
                if (_this.byId("dpRefDocDt").getValue()) 
                    REFDOCDT = sapDateFormat.format(new Date(_this.byId("dpRefDocDt").getValue())) + "T00:00:00";

                console.log("DlvHeaderTbl param", param)

                if (_sHeaderMode == "NEW") {
                    _this.getNumber(param);
                    // oModel.create("/DlvHeaderTblSet", param, {
                    //     method: "POST",
                    //     success: function(data, oResponse) {
                    //         console.log("DlvHeaderTbl create", data)
                    //         MessageBox.information(_oCaption.INFO_SAVE_SUCCESS);
                    //         _this.getHeader();
                    //     },
                    //     error: function(err) {
                    //         console.log("error", err)
                    //         _this.closeLoadingDialog();
                    //     }
                    // });
                } else if (_sHeaderMode == "EDIT") {
                    var sEntitySet = "/DlvHeaderTblSet(DLVNO='" + _oHeader.dlvNo + "')";

                    console.log("DlvHeaderTblSeT param", sEntitySet, param)
                    oModel.update(sEntitySet, param, {
                        method: "PUT",
                        success: function(data, oResponse) {
                            console.log(sEntitySet, data, oResponse);
                            MessageBox.information(_oCaption.INFO_SAVE_SUCCESS);
                            _this.getHeader();
                        },
                        error: function(err) {
                            console.log("error", err)
                            _this.closeLoadingDialog();
                        }
                    });
                }

                this.setControlEditMode("header", false);
            },

            onCancelHeader() {
                sap.m.MessageBox.confirm(_oCaption.CONFIRM_DISREGARD_CHANGE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction == "Yes") {
                            if (_sHeaderMode == "NEW") {
                                _this._router.navTo("RouteMain", {}, true);
                            } else if (_sHeaderMode == "EDIT") {
                                _this.setControlEditMode("header", false);
                            }
                        }
                    }
                });
            },

            onCreateDlvDtlHU() {
                if (_oHeader.status != "00") {
                    MessageBox.warning(_oCaption.WARN_ADD_NOT_ALLOW);
                    return;
                }

                this._router.navTo("RouteDeliveryItem", {
                    sbu: _this.getView().getModel("ui").getData().activeSbu,
                    dlvNo: _oHeader.dlvNo,
                    issPlant: _oHeader.issPlant,
                    rcvPlant: _oHeader.rcvPlant
                });
            },

            onDeleteDlvDtlHU() {
                if (_oHeader.status != "00") {
                    MessageBox.warning(_oCaption.WARN_DELETE_NOT_ALLOW);
                    return;
                }

                var oTable = this.byId("dlvDtlHUTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                MessageBox.confirm(_oCaption.INFO_PROCEED_DELETE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction === "Yes") {
                            _this.showLoadingDialog("Deleting...");

                            var oModel = _this.getOwnerComponent().getModel();
                            var aData = _this.getView().getModel("dlvDtlHU").getData().results;
                            var iIdx = 0;
            
                            aSelIdx.forEach(i => {
                                var oData = aData[i];     
                                var sEntitySet = "/DlvDetailHUTblSet(DLVNO='" + oData.DLVNO + "',DLVITEM='" + oData.DLVITEM + "',SEQNO='" + oData.SEQNO + "')";
                                console.log("sEntitySet", sEntitySet)

                                setTimeout(() => {
                                    oModel.remove(sEntitySet, {
                                        method: "DELETE",
                                        success: function(data, oResponse) {
                                            console.log(sEntitySet, data, oResponse)

                                            iIdx++;
                                            if (iIdx === aSelIdx.length) {
                                                _this.onRefreshHeader();
                                                _this.closeLoadingDialog();
                                            }
                                        },
                                        error: function(err) {
                                            console.log("error", err)
                                            _this.closeLoadingDialog();
                                        }
                                    });
                                }, 100);
                            });
                        }
                    }
                });
            },

            onRefresh(pModel) {
                _this.showLoadingDialog("Loading...");
                if (pModel == "dlvDtlHU") _this.getDlvDtlHU();
                else if (pModel == "dlvDtl") _this.getDlvDtl();
                else if (pModel == "statOvw") _this.getStatOvw();
                else if (pModel == "matDoc") _this.getMatDoc();
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "STRING" || ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
            },

            getResources(pEntitySet, pModel, pFilter) {
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oEntitySet = "/" + pEntitySet;
                var oFilter = (pFilter ? { "$filter": pFilter } : {} )

                oModel.read(oEntitySet, {
                    urlParameters: oFilter,
                    success: function (data, response) {
                        //console.log("getResources", pEntitySet, pModel, data, pFilter)
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
                } else if (sModel == "issSloc") {
                    var oIssSloc = (this.getView().getModel(sModel).getData().results.filter(x => x.SLOC == sKey))[0];
                    _oHeader.whseCd = oIssSloc.WHSECD;
                    _oHeader.storAreaCd = oIssSloc.STORAREACD;
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

                    if (pEditable) {
                        if (_this.getView().getModel("dlvDtlHU").getData().results.length > 0) {
                            this.getView().getModel("ui").setProperty("/editModeHeader2", false);
                        } else {
                            this.getView().getModel("ui").setProperty("/editModeHeader2", pEditable);
                        }
                    } else {
                        this.getView().getModel("ui").setProperty("/editModeHeader2", pEditable);
                    }

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

            formatTime(pTime) {
                var time = pTime.split(':');
                let now = new Date();
                return (new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...time)).toLocaleTimeString();
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("dlvDtlHUTab") >= 0) {
                    sModel = "dlvDtlHU";
                }
                else if (oTable.getId().indexOf("dlvDtlTab") >= 0) {
                    sModel = "dlvDtl";
                }
                else if (oTable.getId().indexOf("statOvwTab") >= 0) {
                    sModel = "statOvw";
                }
                else if (oTable.getId().indexOf("matDocTab") >= 0) {
                    sModel = "matDoc";
                }

                console.log("onFirstVisibleRowChanged", sModel)

                setTimeout(() => {
                    var oData = oTable.getModel(sModel).getData().results;
                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);

                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("dlvDtlHUTab") >= 0) {
                    sModel = "dlvDtlHU";
                }
                else if (oTable.getId().indexOf("dlvDtlTab") >= 0) {
                    sModel = "dlvDtl";
                }
                else if (oTable.getId().indexOf("statOvwTab") >= 0) {
                    sModel = "statOvw";
                }
                else if (oTable.getId().indexOf("matDocTab") >= 0) {
                    sModel = "matDoc";
                }

                this.setActiveRowHighlight(sModel);
            },

            setActiveRowHighlight(arg) {
                var oTable = this.byId(arg + "Tab");

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                    oTable.getRows().forEach((row, idx) => {
                        if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else {
                            row.removeStyleClass("activeRow");
                        }
                    })
                }, 2);
            },

            onCellClick: function(oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("dlvDtlHUTab") >= 0) {
                        sModel = "dlvDtlHU";
                    }
                    else if (oTable.getId().indexOf("dlvDtlTab") >= 0) {
                        sModel = "dlvDtl";
                    }
                    else if (oTable.getId().indexOf("statOvwTab") >= 0) {
                        sModel = "statOvw";
                    }
                    else if (oTable.getId().indexOf("matDocTab") >= 0) {
                        sModel = "matDoc";
                    }

                    oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }
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

                oDDTextParam.push({CODE: "POST"});

                // MessageBox
                // oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                // oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                // oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                oDDTextParam.push({CODE: "INFO_SAVE_SUCCESS"});
                oDDTextParam.push({CODE: "WARN_DELETE_NOT_ALLOW"});
                oDDTextParam.push({CODE: "INFO_PROCEED_POST"});
                oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                oDDTextParam.push({CODE: "WARN_ALREADY_DELETED"});
                oDDTextParam.push({CODE: "WARN_EDIT_NOT_ALLOW"});
                oDDTextParam.push({CODE: "WARN_ADD_NOT_ALLOW"});
                oDDTextParam.push({CODE: "INFO_PROCEED_DELETE"});
                oDDTextParam.push({CODE: "WARN_NOT_STATUS_GR_POSTED"});
                oDDTextParam.push({CODE: "WARN_NO_DATA_DLVDTLHU"});
                
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