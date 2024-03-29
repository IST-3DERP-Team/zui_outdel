sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField',
    "../js/TableValueHelp"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
     function (BaseController, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField, TableValueHelp) {
        "use strict";
        
        var _this;
        var _oCaption = {};
        var _aColumns = {};
        var _startUpInfo = {};
        var _oHeader = {};
        var _sHeaderMode = "";
        var _sNoRangeCd = "";
        var _bAppChange;
        var _matTypeGrp = "";
        var _aTableProp = [];

        return BaseController.extend("zuioutdel.controller.InterplantTransferDC", {
            onInit: function () {
                _this = this;

                _this.getCaption();

                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteInterplantTransferDC").attachPatternMatched(this._routePatternMatched, this);
            },

            _routePatternMatched: function (oEvent) {
                this.getView().setModel(new JSONModel({
                    sbu: oEvent.getParameter("arguments").sbu,
                    activeDlvNo: oEvent.getParameter("arguments").dlvNo,
                    editModeHeader: false,
                    editModeHeader2: false,
                    rowCountDlvDtlHU: 0,
                    rowCountDlvDtl: 0,
                    rowCountStatOvw: 0,
                    rowCountMatDoc: 0
                }), "ui");

                _this.initializeComponent();

                if (sap.ui.getCore().byId("backBtn")) {
                    sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function(oEvent) {
                        _this.onNavBack();
                    }
                }
            },

            initializeComponent() {
                var sSbu = _this.getView().getModel("ui").getProperty("/sbu");

                this.onInitBase(_this, sSbu);
                this.getAppAction();

                setTimeout(() => {
                    _bAppChange = _this.getView().getModel("base").getProperty("/appChange");
                    this.setControlAppAction(_bAppChange);
                }, 100);

                _this.showLoadingDialog("Loading...");

                _aTableProp.push({
                    modCode: "OUTDELDLVDTLHUMOD",
                    tblSrc: "ZDV_OUTDELDLVHU",
                    tblId: "dlvDtlHUTab",
                    tblModel: "dlvDtlHU"
                });

                _aTableProp.push({
                    modCode: "OUTDELDLVDTLMOD",
                    tblSrc: "ZDV_OUTDELDLV",
                    tblId: "dlvDtlTab",
                    tblModel: "dlvDtl"
                });

                _aTableProp.push({
                    modCode: "OUTDELSTATOVWMOD",
                    tblSrc: "ZDV_OUTDELSTAT",
                    tblId: "statOvwTab",
                    tblModel: "statOvw"
                });

                _aTableProp.push({
                    modCode: "OUTDELMATDOCMOD",
                    tblSrc: "ZDV_OUTDELDOC",
                    tblId: "matDocTab",
                    tblModel: "matDoc"
                });

                _this.getColumns(_aTableProp);

                if (sap.ushell.Container) {
                    var oModelStartUp= new sap.ui.model.json.JSONModel();
                    oModelStartUp.loadData("/sap/bc/ui2/start_up").then(() => {
                        _startUpInfo = oModelStartUp.oData;
                    });
                }
                else {
                    _startUpInfo.id = "BAS_CONN";
                }

                this.getResources("Status001Set", "status", "");
                this.getResources("PlantSet", "issPlant", "SBU eq '" + sSbu + "' and DCIND eq 'X'");
                this.getResources("PlantSet", "rcvPlant", "SBU eq '" + sSbu + "' and DCIND eq ''");
                this.getResources("ShipModeSet", "shipMode", "");

                this.byId("itbDetails").setSelectedKey("dlvDtlHU");

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
                    },

                    onclick: function(oEvent) {
                        _this.onTableClick(oEvent);
                    }
                };

                this.byId("dlvDtlHUTab").addEventDelegate(oTableEventDelegate);
                this.byId("dlvDtlTab").addEventDelegate(oTableEventDelegate);
                this.byId("statOvwTab").addEventDelegate(oTableEventDelegate);
                this.byId("matDocTab").addEventDelegate(oTableEventDelegate);

                var oFormEventDelegate = {
                    onclick: function(oEvent) {
                        _this._sActiveTable = "frmHeader";
                    }
                };

                this.byId("frmHeader").addEventDelegate(oFormEventDelegate);

                setTimeout(() => {
                    _this.onChangeHeader();
                }, 1500);

                this._sActiveTable = "frmHeader";
                _this.closeLoadingDialog();
            },

            onAfterTableRender(pTableId, pTableProps) {
                //console.log("onAfterTableRendering", pTableId)
            },

            onChangeHeader() {
                // Set Placeholder
                if (!this.byId("iptIssPlant").getSelectedKey()) {
                    this.byId("iptIssSloc").setPlaceholder(_oCaption.ISSPLANT + " is required.");
                } else {
                    this.byId("iptIssSloc").setPlaceholder("");
                }

                if (!this.byId("iptRcvPlant").getSelectedKey()) {
                    this.byId("iptRcvSloc").setPlaceholder(_oCaption.RCVPLANT + " is required.");
                } else {
                    this.byId("iptRcvSloc").setPlaceholder("");
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
                        _oHeader.docDt = (oDlvHdr.DOCDT ? _this.formatDate(oDlvHdr.DOCDT) : "");
                        _oHeader.reqDt = (oDlvHdr.PLANDLVDT ? _this.formatDate(oDlvHdr.PLANDLVDT) : "");
                        _oHeader.postDt = (oDlvHdr.POSTDT ? _this.formatDate(oDlvHdr.POSTDT) : "");
                        _oHeader.actIssDt = (oDlvHdr.ACTDLVDT ? _this.formatDate(oDlvHdr.ACTDLVDT) : "");

                        _oHeader.issPlant = oDlvHdr.ISSPLNT;
                        _oHeader.issSloc = oDlvHdr.ISSSLOC;
                        _oHeader.rcvPlant = oDlvHdr.RCVPLNT;
                        _oHeader.rcvSloc = oDlvHdr.RCVSLOC;
                        _oHeader.etd = (oDlvHdr.ETD ? _this.formatDate(oDlvHdr.ETD) : "");
                        _oHeader.eta = (oDlvHdr.ETA ? _this.formatDate(oDlvHdr.ETA) : "");
                        _oHeader.shipMode = oDlvHdr.EVERS;

                        _oHeader.vessel = oDlvHdr.VESSEL;
                        _oHeader.containerNo = oDlvHdr.CONTNO;
                        _oHeader.hbl = oDlvHdr.HBL;
                        _oHeader.mbl = oDlvHdr.MBL;
                        _oHeader.noPack = oDlvHdr.TOTALPKG;
                        _oHeader.createdBy = oDlvHdr.CREATEDBY;
                        _oHeader.createdDt = (oDlvHdr.CREATEDDT ? _this.formatDate(oDlvHdr.CREATEDDT) + " " + 
                            _this.formatTime(oDlvHdr.CREATEDTM) : "");
                        
                        _oHeader.forwarder = oDlvHdr.FORWRDR;
                        _oHeader.carrier = oDlvHdr.CARRIER;
                        _oHeader.refDocNo = oDlvHdr.REFDOC;
                        _oHeader.refDocDt = (oDlvHdr.REFDOCDT ? _this.formatDate(oDlvHdr.REFDOCDT) : "");
                        _oHeader.deleted = (oDlvHdr.DELETED == "X" ? true : false);
                        _oHeader.updatedBy = oDlvHdr.UPDATEDBY;
                        _oHeader.updatedDt = (oDlvHdr.UPDATEDDT ? _this.formatDate(oDlvHdr.UPDATEDDT) + " " +
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
                        _this.getMatDoc();
                        _this.getStatOvw();

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

                var aFilters = [],
                    aFilter = [],
                    aSmartFilter = [];

                aFilters.push(new Filter("DLVNO", FilterOperator.EQ, sDlvNo));
                aSmartFilter.push(new Filter(aFilters, true));

                // var sFilter = "DLVNO eq '" + sDlvNo + "'";
                oModel.read('/DlvDetailHUSet', {
                    // urlParameters: {
                    //     "$filter": sFilter
                    // },
                    filters: aSmartFilter,
                    success: function (data, response) {
                        console.log("DlvDetailHUSet", data)

                        data.results.forEach((item, idx) => {

                            item.DELETED = item.DELETED === "X" ? true : false;

                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = _this.formatDate(item.CREATEDDT) + " " + _this.formatTime(item.CREATEDTM);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = _this.formatDate(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);

                            if (idx == 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvDtlHU");
                        _this._tableRendered = "dlvDtlHUTab";

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountDlvDtlHU", data.results.length);

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
                        data.results.forEach((item, idx) => {

                            item.DELETED = item.DELETED === "X" ? true : false;

                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = _this.formatDate(item.CREATEDDT) + " " + _this.formatTime(item.CREATEDTM);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = _this.formatDate(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);

                            if (idx == 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        })

                        var oJSONModel = new sap.ui.model.json.JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "dlvDtl");

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountDlvDtl", data.results.length);

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
                        data.results.sort((a,b) => (a.DLVSTATCD > b.DLVSTATCD ? 1 : -1));

                        data.results.forEach((item, idx) => {
                            item.COMPLETE = item.COMPLETE === "X" ? true : false;
                            console.log("status", _this.getView().getModel("status").getData().results, item.DLVSTATCD)
                            var oStatus = _this.getView().getModel("status").getData().results.filter(x => x.STATUS == item.DLVSTATCD)[0];
                            item.DLVSTATCD = oStatus.DESCRIP + " (" + item.DLVSTATCD + ")";

                            if (item.STARTDT !== null)
                                item.STARTDT = _this.formatDate(item.STARTDT) + " " + _this.formatTime(item.STARTTM);

                            if (item.ENDDT !== null)
                                item.ENDDT = _this.formatDate(item.ENDDT) + " " + _this.formatTime(item.ENDTM);

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = _this.formatDate(item.UPDATEDDT) + " " + _this.formatTime(item.UPDATEDTM);

                            if (idx == 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        });

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "statOvw");

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountStatOvw", data.results.length);

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
                        data.results.forEach((item, idx) => {
                            if (item.DOCDT !== null)
                                    item.DOCDT = _this.formatDate(item.DOCDT);

                            if (item.POSTDT !== null)
                                item.POSTDT = _this.formatDate(item.POSTDT);

                            if (idx == 0) item.ACTIVE = "X";
                            else item.ACTIVE = "";
                        });

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(data);
                        _this.getView().setModel(oJSONModel, "matDoc");

                        // Set row count
                        _this.getView().getModel("ui").setProperty("/rowCountMatDoc", data.results.length);

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
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return;
                }

                if (_oHeader.status == "54") {
                    MessageBox.warning(_oCaption.WARN_EDIT_NOT_ALLOW);
                    return;
                }

                _this.setControlEditMode("header", true);
                _this.getView().getModel("base").setProperty("/dataMode", "EDIT");
            },

            onDeleteHeader() {
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return;
                }

                if (_oHeader.status == "54") {
                    MessageBox.warning(_oCaption.WARN_DELETE_NOT_ALLOW);
                    return;
                }
                
                if (_this.getView().getModel("dlvDtlHU").getData().results.length > 0) {
                    MessageBox.warning(_oCaption.WARN_DELETE_NOT_ALLOW + "\n" + _oCaption.WARN_ALREADY_HAS_DETAIL);
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

            onPostHeader: async function() {
                var bValidate = await _this.validatePost();
                if (bValidate == false) return;

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

                                    if (oResult.N_POST901_RETURN.results.length > 0 && 
                                        oResult.N_POST901_RETURN.results[0].Type != "E") {
                                        var oModel = _this.getOwnerComponent().getModel();
                                        var sFilter = "REFDLVNO eq '" + _oHeader.dlvNo + "'";
                                        oModel.read('/DlvHeaderNewIDSet', {
                                            urlParameters: {
                                                "$filter": sFilter
                                            },
                                            success: function (data, response) {
                                                console.log("DlvHeaderNewIDSet", data);
                                                if (data.results.length > 0) {
                                                    MessageBox.information(_oCaption.INFO_ID_CREATED + " " + data.results[0].DLVNO + ".");
                                                }
                                            },
                                            error: function (err) { 
                                                console.log("error", err)
                                            }
                                        })
    
                                        //MessageBox.information(oResult.N_POST901_RETURN.results[0].Message);
                                        
                                        _this.getHeader();
                                    }
                                    else if (oResult.N_POST901_RETURN.results.length > 0) {
                                        MessageBox.error(oResult.N_POST901_RETURN.results[0].Message);
                                    }
                                    else {
                                        MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                    }

                                    _this.closeLoadingDialog();
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

            validatePost: async function() {
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return false;
                }

                if (_oHeader.status == "54") {
                    MessageBox.warning(_oCaption.WARN_NOT_STATUS_GR_POSTED);
                    _this.closeLoadingDialog();
                    return false;
                }

                if (_this.getView().getModel("dlvDtlHU").getData().results.length == 0) {
                    MessageBox.warning(_oCaption.WARN_NO_DATA_DLVDTLHU);
                    _this.closeLoadingDialog();
                    return false;
                }

                var oModel = _this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var sFilter = "DLVNO eq '" + sDlvNo + "'";
                var iLength = 0;

                var oPromiseResult = new Promise((resolve, reject) => {
                    oModel.read('/IOTransferSet', {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {
                            console.log("IOTransferSet", data);
                            resolve();
    
                            if (data.results.length > 0) {
                                iLength = data.results.length;

                                var oJSONModel = new sap.ui.model.json.JSONModel();
                                oJSONModel.setData(data);
                                _this.getView().setModel(oJSONModel, "ioTransfer");
    
                                _this._IOTransfer = sap.ui.xmlfragment(_this.getView().getId(), "zuioutdel.view.fragments.dialog.IOTransfer", _this);
                                _this._IOTransfer.setModel(oJSONModel);
                                _this.getView().addDependent(_this._IOTransfer);
    
                                _this._IOTransfer.addStyleClass("sapUiSizeCompact");
                                _this._IOTransfer.open();
                            }
                        },
                        error: function (err) { 
                            console.log("error", err)
                        }
                    })
                })

                await oPromiseResult;

                if (iLength > 0) return false;
                else return true;
            },

            onReverseHeader: async function() {
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return;
                }

                if (_oHeader.status != "54") {
                    MessageBox.warning(_oCaption.WARN_STATUS_POSTED_REVERSE);
                    return;
                }

                var oModel = _this.getOwnerComponent().getModel();
                var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
                var sFilter = "VARKEY eq '" + sDlvNo + "'";
                var aDataLock = {results: []};

                var oPromiseResult = new Promise((resolve, reject) => {
                    oModel.read('/LockInboundSet', {
                        urlParameters: {
                            "$filter": sFilter
                        },
                        success: function (data, response) {
                            console.log("LockInboundSet", data);
                            if (data.results.length > 0) aDataLock = data;
                            resolve();
                        },
                        error: function (err) { 
                            console.log("error", err)
                            resolve();
                        }
                    })
                })

                await oPromiseResult;

                if (aDataLock.results.length > 0) {
                    MessageBox.warning(_oCaption.INFO_REVERSAL_CANT_PROCEED + ". ID " + aDataLock.results[0].VARKEY.replace("888", "") +
                    " " + _oCaption.INFO_IS_LOCK_BY_USER + " " + aDataLock.results[0].UPDATEBY);
                }
                else {
                    var oJSONModel = new JSONModel();
                    oJSONModel.setData({
                        postDt: _oHeader.postDt
                    })

                    _this._Reverse = sap.ui.xmlfragment(_this.getView().getId(), "zuioutdel.view.fragments.dialog.Reverse", _this);
                    _this._Reverse.setModel(oJSONModel);
                    _this.getView().addDependent(_this._Reverse);

                    _this._Reverse.addStyleClass("sapUiSizeCompact");
                    _this._Reverse.open();
                }

                // MessageBox.confirm(_oCaption.CONFIRM_PROCEED_REVERSAL, {
                //     actions: ["Yes", "No"],
                //     onClose: function (sAction) {
                //         if (sAction === "Yes") {
                //             _this.showLoadingDialog("Loading...");

                //             var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                //             var oParam = {
                //                 "iv_dlvno": _oHeader.dlvNo,
                //                 "iv_userid": _startUpInfo.id,
                //                 "iv_pstngdt": _this.formatDate(_this.byId("dpPostDt").getValue()) + "T00:00:00",
                //                 "N_IDOD_ET_CANC": [],
                //                 "N_IDOD_RETURN": []
                //             };

                //             console.log("IDOD_ReverseSet param", oParam);
                //             oModelRFC.create("/IDOD_ReverseSet", oParam, {
                //                 method: "POST",
                //                 success: function(oResult, oResponse) {
                //                     console.log("IDOD_ReverseSet", oResult, oResponse);

                //                     _this.closeLoadingDialog();
                //                     if (oResult.N_IDOD_ET_CANC.results.length > 0) { //oResult.N_IDOD_ET_CANC.results[0].Type == "S"

                //                         MessageBox.information(oResult.N_IDOD_ET_CANC.results[0].Message);
                //                         _this.getHeader();
                //                     } else if (oResult.N_IDOD_RETURN.results.length > 0) {
                //                         MessageBox.information(oResult.N_IDOD_RETURN.results[0].Message);
                //                     } else {
                //                         MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                //                     }
                //                 },
                //                 error: function(err) {
                //                     MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                //                     _this.closeLoadingDialog();
                //                 }
                //             });
                //         }
                //     }
                // });
            },

            onProceedReverse(oEvent) {
                _this.showLoadingDialog();

                var oModel = this.getOwnerComponent().getModel();
                var sUser = _startUpInfo.id;
                var sPostDt = new Date(_this.byId("dpReversePostDt").getValue());
                var sBuperDt =  sPostDt.getFullYear() +  ('0' + (sPostDt.getMonth() + 1)).slice(-2)
                var sFilter = "USNAM eq '" + sUser + "' and BUPER_FROM eq '" + sBuperDt + "'";

                console.log("ReverseSet param", sFilter);
                oModel.read("/ReverseSet", {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("ReverseSet read", data);

                        if (data.results.length > 0) {
                            var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                            var oParam = {
                                "iv_dlvno": _oHeader.dlvNo,
                                "iv_userid": _startUpInfo.id,
                                "iv_pstngdt": _this.formatDate(_this.byId("dpPostDt").getValue()) + "T00:00:00",
                                "N_IDOD_ET_CANC": [],
                                "N_IDOD_RETURN": []
                            };

                            console.log("IDOD_ReverseSet param", oParam);
                            oModelRFC.create("/IDOD_ReverseSet", oParam, {
                                method: "POST",
                                success: function(oResult, oResponse) {
                                    console.log("IDOD_ReverseSet", oResult, oResponse);

                                    _this.closeLoadingDialog();
                                    if (oResult.N_IDOD_ET_CANC.results.length > 0) { //oResult.N_IDOD_ET_CANC.results[0].Type == "S"

                                        MessageBox.information(oResult.N_IDOD_ET_CANC.results[0].Message);
                                        _this.getHeader();
                                    } else if (oResult.N_IDOD_RETURN.results.length > 0) {
                                        MessageBox.information(oResult.N_IDOD_RETURN.results[0].Message);
                                    } else {
                                        MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                    }
                                },
                                error: function(err) {
                                    MessageBox.error(_oCaption.INFO_EXECUTE_FAIL);
                                    _this.closeLoadingDialog();
                                }
                            });
                        }
                        else {
                            MessageBox.information(_oCaption.POSTDT + " " + _oCaption.INFO_IS_NOT_VALID);
                        }

                        _this.closeLoadingDialog();
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                })
            },

            onCancelReverse() {
                _this._Reverse.destroy(true);
            },

            onRefreshHeader() {
                _this.getHeader();
            },

            onCloseHeader() {
                _this.onNavBack();
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

                    _this.byId("iptIssPlant").setSelectedKey(_oHeader.issPlant);
                    _this.byId("iptIssSloc").setSelectedKey(_oHeader.issSloc);
                    _this.byId("iptRcvPlant").setSelectedKey(_oHeader.rcvPlant);
                    _this.byId("iptRcvSloc").setSelectedKey(_oHeader.rcvSloc);
                    _this.byId("dpETD").setValue(_oHeader.etd);
                    _this.byId("dpETA").setValue(_oHeader.eta);
                    _this.byId("iptShipMode").setSelectedKey(_oHeader.shipMode);
                    _this.byId("iptShipMode").setSelectedKey(_oHeader.shipMode);

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
                    var sCurrentDate = _this.formatDate(new Date());

                    _this.byId("iptDlvNo").setValue(_oHeader.dlvNo);
                    _this.byId("iptMvtType").setValue(_oHeader.mvtType);
                    _this.byId("cmbStatus").setSelectedKey(_oHeader.status);
                    _this.byId("dpDocDt").setValue(sCurrentDate);
                    _this.byId("dpReqDt").setValue(sCurrentDate);
                    _this.byId("dpPostDt").setValue(sCurrentDate);
                    _this.byId("dpActIssDt").setValue(sCurrentDate);

                    _this.byId("iptIssPlant").setSelectedKey("");
                    _this.byId("iptIssSloc").setSelectedKey("");
                    _this.byId("iptRcvPlant").setSelectedKey("");
                    _this.byId("iptRcvSloc").setSelectedKey("");
                    _this.byId("dpETD").setValue("");
                    _this.byId("dpETA").setValue("");
                    _this.byId("iptShipMode").setSelectedKey("");

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
                    _this.byId("dpRefDocDt").setValue(sCurrentDate);
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
                else if (!this.byId("iptIssPlant").getSelectedKey()) sErrMsg = _oCaption.ISSPLANT;
                else if (!this.byId("iptIssSloc").getSelectedKey()) sErrMsg = _oCaption.ISSSLOC;
                else if (!this.byId("iptRcvPlant").getSelectedKey()) sErrMsg = _oCaption.RCVPLANT;
                else if (!this.byId("iptRcvSloc").getSelectedKey()) sErrMsg = _oCaption.RCVSLOC;
                else if (!this.byId("iptShipMode").getSelectedKey()) sErrMsg = _oCaption.MODESHIP;
                else if (!this.byId("iptRefDocNo").getValue()) sErrMsg = _oCaption.REFDOCNO;

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
                    
                    ISSPLNT: _this.byId("iptIssPlant").getSelectedKey(),
                    ISSSLOC: _this.byId("iptIssSloc").getSelectedKey(),
                    RCVPLNT: _this.byId("iptRcvPlant").getSelectedKey(),
                    RCVSLOC: _this.byId("iptRcvSloc").getSelectedKey(),
                    EVERS: _this.byId("iptShipMode").getSelectedKey(),

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
                    param.DOCDT = _this.formatDate(_this.byId("dpDocDt").getValue()) + "T00:00:00";
                if (_this.byId("dpReqDt").getValue()) 
                    param.PLANDLVDT = _this.formatDate(_this.byId("dpReqDt").getValue()) + "T00:00:00";
                if (_this.byId("dpPostDt").getValue()) 
                    param.POSTDT = _this.formatDate(_this.byId("dpPostDt").getValue()) + "T00:00:00";
                if (_this.byId("dpActIssDt").getValue()) 
                    param.ACTDLVDT = _this.formatDate(_this.byId("dpActIssDt").getValue()) + "T00:00:00";
                if (_this.byId("dpETD").getValue()) 
                    param.ETD = _this.formatDate(_this.byId("dpETD").getValue()) + "T00:00:00";
                if (_this.byId("dpETA").getValue()) 
                    param.ETA = _this.formatDate(_this.byId("dpETA").getValue()) + "T00:00:00";
                if (_this.byId("dpRefDocDt").getValue()) 
                    param.REFDOCDT = _this.formatDate(_this.byId("dpRefDocDt").getValue()) + "T00:00:00";

                console.log("DlvHeaderTbl param", param)

                if (_sHeaderMode == "NEW") {
                    _this.getNumber(param);
                    _this.getView().getModel("base").setProperty("/dataMode", "READ");
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
                            _this.getView().getModel("base").setProperty("/dataMode", "READ");
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
                                _this.setControlEditMode("header", false);
                                _this.getView().getModel("base").setProperty("/dataMode", "READ");
                                _this._router.navTo("RouteMain", {}, true);
                            } else if (_sHeaderMode == "EDIT") {
                                _this.setControlEditMode("header", false);
                                _this.getView().getModel("base").setProperty("/dataMode", "READ");
                            }
                        }
                    }
                });
            },

            onCreateDlvDtlHU() {
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return;
                }

                if (_oHeader.status != "50") {
                    MessageBox.warning(_oCaption.WARN_ADD_NOT_ALLOW);
                    return;
                }

                this._router.navTo("RouteDeliveryItem", {
                    sbu: _this.getView().getModel("ui").getData().sbu,
                    dlvNo: _oHeader.dlvNo,
                    issPlant: _oHeader.issPlant,
                    rcvPlant: _oHeader.rcvPlant,
                    matTypeGrp: _matTypeGrp
                });
            },

            onDeleteDlvDtlHU() {
                if (_oHeader.deleted) {
                    MessageBox.warning(_oCaption.WARN_ALREADY_DELETED);
                    return;
                }
                
                if (_oHeader.status != "50") {
                    MessageBox.warning(_oCaption.WARN_DELETE_NOT_ALLOW);
                    return;
                }

                var oTable = this.byId("dlvDtlHUTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                MessageBox.confirm(_oCaption.INFO_PROCEED_DELETE, {
                    actions: ["Yes", "No"],
                    onClose: function (sAction) {
                        if (sAction === "Yes") {
                            _this.showLoadingDialog("Deleting...");

                            var oModel = _this.getOwnerComponent().getModel();
                            var aData = _this.getView().getModel("dlvDtlHU").getData().results;
                            var iIdx = 0;
            
                            aOrigSelIdx.forEach(i => {
                                var oData = aData[i];     
                                var sEntitySet = "/DlvDetailHUTblSet(DLVNO='" + oData.DLVNO + "',DLVITEM='" + oData.DLVITEM + "',SEQNO='" + oData.SEQNO + "')";
                                console.log("sEntitySet", sEntitySet)

                                setTimeout(() => {
                                    oModel.remove(sEntitySet, {
                                        method: "DELETE",
                                        success: function(data, oResponse) {
                                            console.log(sEntitySet, data, oResponse)

                                            iIdx++;
                                            if (iIdx === aOrigSelIdx.length) {
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

            onCloseIOTransfer() {
                _this._IOTransfer.destroy(true);
            },

            onAddHK() {
                if (_this.getView().getModel("base").getData().dataMode == "READ" && _this.getView().getModel("base").getData().appChange) {
                    if (this._sActiveTable === "dlvDtlHUTab") this.onCreateDlvDtlHU();
                }
            },

            onEditHK() {
                if (_this.getView().getModel("base").getData().dataMode == "READ"  && _this.getView().getModel("base").getData().appChange) {
                    if (this._sActiveTable === "frmHeader") this.onEditHeader();
                }
            },

            onDeleteHK() {
                if (_this.getView().getModel("base").getData().dataMode == "READ"  && _this.getView().getModel("base").getData().appChange) {
                    if (this._sActiveTable === "frmHeader") this.onDeleteHeader();
                    else if (this._sActiveTable === "dlvDtlHUTab") this.onDeleteDlvDtlHU();
                }
            },

            onSaveHK() {
                if ((_this.getView().getModel("base").getData().dataMode == "NEW" || 
                    _this.getView().getModel("base").getData().dataMode == "EDIT")  && 
                    _this.getView().getModel("base").getData().appChange) {
                    if (this._sActiveTable === "frmHeader") this.onSaveHeader();
                }
            },

            onCancelHK() {
                if ((_this.getView().getModel("base").getData().dataMode == "NEW" || 
                    _this.getView().getModel("base").getData().dataMode == "EDIT")  && 
                    _this.getView().getModel("base").getData().appChange) {
                    if (this._sActiveTable === "frmHeader") this.onCancelHeader();
                }
            },

            onRefreshHK() {
                console.log("onRefreshHK")
                if (_this.getView().getModel("base").getData().dataMode == "READ") {
                    if (this._sActiveTable === "frmHeader") this.onRefreshHeader();
                    else if (this._sActiveTable === "dlvDtlHUTab") this.onRefresh("dlvDtlHU");
                    else if (this._sActiveTable === "dlvDtlTab") this.onRefresh("dlvDtl");
                    else if (this._sActiveTable === "statOvwTab") this.onRefresh("statOvw");
                    else if (this._sActiveTable === "matDocTab") this.onRefresh("matDoc");
                }
            },

            onNavBack() {
                // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // oRouter.navTo("RouteMain", {}, true);

                if (_bAppChange) {
                    _this.showLoadingDialog("Loading...");

                    var oModelLock = _this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
                    var sDlvNo = _this.getView().getModel("ui").getData().activeDlvNo;
    
                    var oParamLock = {
                        Dlvno: sDlvNo,
                        Lock_Unlock_Ind: "",
                        N_LOCK_UNLOCK_DLVHDR_RET: [],
                        N_LOCK_UNLOCK_DLVHDR_MSG: []
                    }
    
                    oModelLock.create("/Lock_Unlock_DlvHdrSet", oParamLock, {
                        method: "POST",
                        success: function(data, oResponse) {
                            console.log("Lock_Unlock_DlvHdrSet", data);
                            _this.closeLoadingDialog();
    
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(_this);
                            oRouter.navTo("RouteMain", {}, true);
                        },
                        error: function(err) {
                            MessageBox.error(err);
                            _this.closeLoadingDialog();
                        }
                    }); 
                } else {
                    var oRouter = sap.ui.core.UIComponent.getRouterFor(_this);
                    oRouter.navTo("RouteMain", {}, true);
                }
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
                            if (data.results.length > 0) _this.byId("iptIssSloc").setPlaceholder("");
                            else _this.byId("iptIssSloc").setPlaceholder("No data for selected " + _oCaption.ISSPLANT);
                        } else if (pModel == "rcvSloc" && data.results.length > 0) {
                            if (data.results.length > 0) {
                                if (_this.byId("iptIssSloc").getSelectedKey()) {
                                    var sIssSloc = _this.byId("iptIssSloc").getSelectedKey();
                                    var oDataIssSloc = _this.getView().getModel("issSloc").getProperty("/results")
                                        .filter(x => x.SLOC == sIssSloc)[0];
                                    var oDataRcvSloc = _this.getView().getModel("rcvSloc").getProperty("/results")
                                        .filter(x => x.MATTYPEGRP == oDataIssSloc.MATTYPEGRP)[0];

                                    _this.byId("iptRcvSloc").setSelectedKey(oDataRcvSloc.SLOC);
                                    _matTypeGrp = oDataIssSloc.MATTYPEGRP;
                                } else {
                                    _this.byId("iptRcvSloc").setPlaceholder("");
                                }
                            }
                            else _this.byId("iptRcvSloc").setPlaceholder("No data for selected " + _oCaption.RCVPLANT);
                        }
                    },
                    error: function (err) {
                    }
                })
            },

            onFormValueHelpInputChange(oEvent) {
                var oSource = oEvent.getSource();
                var sId = oSource.getId();
                var sKey = oSource.mProperties.selectedKey;

                if (sId.includes("iptIssPlant")) {
                    this.getResources("SLocSet", "issSloc", "PLANTCD eq '" + sKey + "'");
                }
                else if (sId.includes("iptIssSloc")) {
                    var oIssSloc = (this.getView().getModel("issSloc").getData().results.filter(x => x.SLOC == sKey))[0];
                    _oHeader.whseCd = oIssSloc.WHSECD;
                    _oHeader.storAreaCd = oIssSloc.STORAREACD;
                }
                else if (sId.includes("iptRcvPlant")) {
                    this.getResources("SLocSet", "rcvSloc", "PLANTCD eq '" + sKey + "'");
                }
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
                    var fields = ["feDocDt", "feReqDt", "feIssPlant", "feIssSloc", "feRcvPlant", "feRcvSloc", "feShipMode", "feRefDocNo"];

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

                        _aColumns[pType].filter(item => item.label === col.getLabel().getText())
                            .forEach(ci => {
                                if (ci.required) {
                                    col.getLabel().removeStyleClass("requiredField");
                                }
                            })
                    })
                }
            },

            setControlEditMode(pType, pEditable) {
                
                if (_bAppChange) {
                    if (sap.ushell.Container) sap.ushell.Container.setDirtyFlag(pEditable);

                    if (pType == "header") {
                        // Header
                        this.byId("btnEditHeader").setVisible(!pEditable);
                        this.byId("btnDeleteHeader").setVisible(!pEditable);
                        this.byId("btnSetStatusHeader").setVisible(!pEditable);
                        this.byId("btnRefreshHeader").setVisible(!pEditable);
                        //this.byId("btnPrintHeader").setVisible(!pEditable);
                        this.byId("btnCloseHeader").setVisible(!pEditable);
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
                        this.byId("btnFullScreenDlvDtlHU").setEnabled(!pEditable);
                        this.byId("btnTabLayoutDlvDtlHU").setEnabled(!pEditable);

                        this.byId("btnRefreshDlvDtl").setEnabled(!pEditable);
                        this.byId("btnFullScreenDlvDtl").setEnabled(!pEditable);
                        this.byId("btnTabLayoutDlvDtl").setEnabled(!pEditable);

                        this.byId("btnRefreshStatOvw").setEnabled(!pEditable);
                        this.byId("btnFullScreenStatOvw").setEnabled(!pEditable);
                        this.byId("btnTabLayoutStatOvw").setEnabled(!pEditable);

                        this.byId("btnRefreshMatDoc").setEnabled(!pEditable);
                        this.byId("btnFullScreenMatDoc").setEnabled(!pEditable);
                        this.byId("btnTabLayoutMatDoc").setEnabled(!pEditable);
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
                }
            },

            setControlAppAction(pChange) {

                // Header
                this.byId("btnEditHeader").setVisible(pChange);
                this.byId("btnDeleteHeader").setVisible(pChange);
                this.byId("btnSetStatusHeader").setVisible(pChange);
                this.byId("btnRefreshHeader").setVisible(true);
                //this.byId("btnPrintHeader").setVisible(true);
                this.byId("btnCloseHeader").setVisible(true);
                this.byId("btnSaveHeader").setVisible(false);
                this.byId("btnCancelHeader").setVisible(false);

                // Detail
                this.byId("btnCreateDlvDtlHU").setVisible(pChange);
                this.byId("btnDeleteDlvDtlHU").setVisible(pChange);
                this.byId("btnRefreshDlvDtlHU").setVisible(true);
                this.byId("btnRefreshDlvDtl").setVisible(true);
                this.byId("btnRefreshStatOvw").setVisible(true);
                this.byId("btnRefreshMatDoc").setVisible(true);
            },

            onTableResize(pGroup, pType) {
                if (pGroup == "hdr") {
                }
                else if (pGroup == "dtl") {
                    if (pType === "Max") {
                        this.byId("btnFullScreenDlvDtlHU").setVisible(false);
                        this.byId("btnExitFullScreenDlvDtlHU").setVisible(true);

                        this.byId("btnFullScreenDlvDtl").setVisible(false);
                        this.byId("btnExitFullScreenDlvDtl").setVisible(true);

                        this.byId("btnFullScreenStatOvw").setVisible(false);
                        this.byId("btnExitFullScreenStatOvw").setVisible(true);

                        this.byId("btnFullScreenMatDoc").setVisible(false);
                        this.byId("btnExitFullScreenMatDoc").setVisible(true);

                        this.getView().byId("tbHeader").setVisible(false);
                        this.getView().byId("frmHeader").setVisible(false);
                        this.getView().byId("itbDetails").setVisible(true);
                    }
                    else {
                        this.byId("btnFullScreenDlvDtlHU").setVisible(true);
                        this.byId("btnExitFullScreenDlvDtlHU").setVisible(false);

                        this.byId("btnFullScreenDlvDtl").setVisible(true);
                        this.byId("btnExitFullScreenDlvDtl").setVisible(false);

                        this.byId("btnFullScreenStatOvw").setVisible(true);
                        this.byId("btnExitFullScreenStatOvw").setVisible(false);

                        this.byId("btnFullScreenMatDoc").setVisible(true);
                        this.byId("btnExitFullScreenMatDoc").setVisible(false);

                        this.getView().byId("tbHeader").setVisible(true);
                        this.getView().byId("frmHeader").setVisible(true);
                        this.getView().byId("itbDetails").setVisible(true);
                    }
                }
            },

            onSaveTableLayout: function (oEvent) {
                var ctr = 1;
                var oTable = oEvent.getSource().oParent.oParent;
                var oColumns = oTable.getColumns();
                var sSBU = _this.getView().getModel("ui").getData().sbu;

                var oParam = {
                    "SBU": sSBU,
                    "TYPE": "",
                    "TABNAME": "",
                    "TableLayoutToItems": []
                };

                _aTableProp.forEach(item => {
                    if (item.tblModel == oTable.getBindingInfo("rows").model) {
                        oParam['TYPE'] = item.modCode;
                        oParam['TABNAME'] = item.tblSrc;
                    }
                });

                oColumns.forEach((column) => {
                    oParam.TableLayoutToItems.push({
                        COLUMNNAME: column.mProperties.sortProperty,
                        ORDER: ctr.toString(),
                        SORTED: column.mProperties.sorted,
                        SORTORDER: column.mProperties.sortOrder,
                        SORTSEQ: "1",
                        VISIBLE: column.mProperties.visible,
                        WIDTH: column.mProperties.width.replace('px','')
                    });

                    ctr++;
                });

                var oModel = _this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function(data, oResponse) {
                        MessageBox.information(_oCaption.INFO_LAYOUT_SAVE);
                    },
                    error: function(err) {
                        MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });                
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

                oDDTextParam.push({CODE: "SETSTATUS"});
                oDDTextParam.push({CODE: "POST"});
                oDDTextParam.push({CODE: "REVERSE"});

                oDDTextParam.push({CODE: "IONO"});
                oDDTextParam.push({CODE: "SRCPLANT"});
                oDDTextParam.push({CODE: "DESTPLANT"});
                oDDTextParam.push({CODE: "CLOSE"});
                oDDTextParam.push({CODE: "ITEM(S)"});
                oDDTextParam.push({CODE: "SEL_DLVTYPE"});

                // Buttons
                oDDTextParam.push({CODE: "ADD"});
                oDDTextParam.push({CODE: "EDIT"});
                oDDTextParam.push({CODE: "DELETE"});
                oDDTextParam.push({CODE: "REFRESH"});
                oDDTextParam.push({CODE: "SETSTATUS"});
                oDDTextParam.push({CODE: "PRINT"});
                oDDTextParam.push({CODE: "CLOSE"});
                oDDTextParam.push({CODE: "SAVE"});
                oDDTextParam.push({CODE: "CANCEL"});
                oDDTextParam.push({CODE: "FULLSCREEN"});
                oDDTextParam.push({CODE: "EXITFULLSCREEN"});
                oDDTextParam.push({CODE: "SAVELAYOUT"});

                // MessageBox
                // oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                // oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                oDDTextParam.push({CODE: "INFO_IS_NOT_VALID"});
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
                oDDTextParam.push({CODE: "WARN_STATUS_POSTED_REVERSE"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_EXECUTE"});
                oDDTextParam.push({CODE: "CONFIRM_PROCEED_REVERSAL"});
                oDDTextParam.push({CODE: "INFO_EXECUTE_FAIL"});
                oDDTextParam.push({CODE: "WARN_ALREADY_HAS_DETAIL"});
                oDDTextParam.push({CODE: "INFO_ID_CREATED"});
                oDDTextParam.push({CODE: "INFO_OD_POST_IOTRANSFER"});
                oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                oDDTextParam.push({CODE: "INFO_IS_LOCK_BY_USER"});
                oDDTextParam.push({CODE: "INFO_REVERSAL_CANT_PROCEED"});
                oDDTextParam.push({CODE: "INFO_SEL_POST_DATE"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        //console.log("CaptionMsgSet", oData.CaptionMsgItems.results)
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