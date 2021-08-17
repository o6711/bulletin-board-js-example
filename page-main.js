$(document).ready(function () {
    declareVarConst();
    performUtilityLogic();
    performMainLogic();

    if (Helper.isPage(Constant.SP_URL.bulletinBoard)) {
        InitPage.board();
    }
    else if (Helper.isPage(Constant.SP_URL.bulletinCreation)) {

        InitPage.creation();
    }
    else if (Helper.isPage(Constant.SP_URL.bulletin)) {
        InitPage.bulletin();
    }
    else if (Helper.isPage(Constant.SP_URL.bulletinEdit)) {
        InitPage.edit();
    }
})

function performMainLogic() {
    InitPage = {
        board: function () {
            CRUD.get_Categories_thenRender(Constant.Page_bulletinBoard.Container.filter_selectCategories);

            CRUD.get_Bulletins_byPaging();

            EventReg.Page_bulletinBoard.onClick_Button_creationNewBulletin();

            EventReg.Page_bulletinBoard.onClick_Button_Filter_StatusApproved();

            EventReg.Page_bulletinBoard.onClick_Button_Filter_StatusPending();

            EventReg.Page_bulletinBoard.onChange_Select_Filter_Categories();

            EventReg.Page_bulletinBoard.onChange_Checkbox_Filter_ShowOnlyMyBulletins();

            EventReg.Page_bulletinBoard.onHashChange_windowEventHandler();
        },

        creation: function () {
            CRUD.get_Categories_thenRender(Constant.Page_bulletinCreation.Container.categoriesSelect);

            EventReg.Page_bulletinCreation.onClick_Button_Submit();

            EventReg.Page_bulletinCreation.onChange_FileUpload();

        },

        bulletin: function () {
            Variable.BulletinId = Helper.extractParamIdFromCurrentPath();

            CRUD.get_BulletinById_thenRenderAs_PageRead();

            EventReg.Page_bulletin.onClick_Button_Action_approve();

            EventReg.Page_bulletin.onClick_Button_Action_modeartion();

            EventReg.Page_bulletin.onClick_Button_Action_edit();

            EventReg.Page_bulletin.onClick_Button_Action_archive();

            EventReg.Page_bulletin.onClick_Button_Action_delete();
        },

        edit: function () {
            Variable.BulletinId = Helper.extractParamIdFromCurrentPath();

            jQuery
                .when(CRUD.get_Categories_thenRender(Constant.Page_bulletinEdit.Container.categoriesSelect))
                .done(function () {

                    CRUD.get_simpleBulletinById_thenRenderAs_PageEdit();
                });


            EventReg.Page_bulletinEdit.onClick_Button_Submit();

            EventReg.Page_bulletinEdit.onChange_FileUpload();

            EventReg.Page_bulletinEdit.onClick_Button_DeleteAttachment();


            EventReg.Page_bulletinEdit.onClick_Button_Action_approve();

            EventReg.Page_bulletinEdit.onClick_Button_Action_modeartion();

            EventReg.Page_bulletinEdit.onClick_Button_Action_archive();

            EventReg.Page_bulletinEdit.onClick_Button_Action_delete();
        }
    },

    CRUD = {
        get_Categories_thenRender: function (targetContainer) {
            var urlForAllItems = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.categories_DisplayName + "')/Items";

            return $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForAllItems,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log("categories from server:");
                    console.log(data.d.results);
                    Variable.List_categories = data.d.results.map(function (category) {
                        return { Title: category.AAATitle, Id: category.ID };
                    });
                    console.log(Variable.List_categories);

                    Render.fill_categoriesSelect(targetContainer);
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        get_BulletinListItemsCount: function () {
            let requestURL = "/_api/Web/Lists/GetByTitle('Bulletin')?$select=ItemCount";

            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + requestURL,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log(data.d.ItemCount);
                    Variable.BulletinList_ItemCount = data.d.ItemCount;

                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        get_Bulletins: function () {
            var urlForAllItems = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items";
            var oDataQuery = "?$select=ID,AAATitle,AAADescription,Attachments,AAACategory/ID,AAACategory/AAATitle,AAAPublicationDate,AAAStatus,Author/Title,Author/Id" +
                "&$expand=AAACategory,Author" +
                "&$orderby=AAAPublicationDate desc";
            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForAllItems + oDataQuery,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log("Bulletins from server:");
                    console.log(data.d.results);
                    Variable.List_bulletins = data.d.results.map(function (bulletin) {
                        return {
                            Id: bulletin.ID,
                            Title: bulletin.AAATitle,
                            Description: bulletin.AAADescription,
                            Category: {
                                Id: bulletin.AAACategory.ID,
                                Title: bulletin.AAACategory.AAATitle
                            },
                            PublicationDate: bulletin.AAAStatus == Constant.SP_Enum.BulletinStatus.Pending ? "On moderation" : Helper.formatDateTime(bulletin.AAAPublicationDate),
                            Author: {
                                Id: bulletin.Author.Id,
                                Name: bulletin.Author.Title,
                                Link: "",
                                FaceImg: ""
                            },
                            PreviewPhoto: "",
                            Status: bulletin.AAAStatus,
                            HasAttachments: bulletin.Attachments
                        };
                    });
                    console.log(Variable.List_bulletins);
                    Render.fill_bulletinsList();
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        get_BulletinsCount_byFiltering: function () { // perform via /_vti_bin/
            let historyState = Variable.HistoryState;
            let filterCtegory = historyState.Category == 'Any' ? '' : `Category eq ${historyState.Category} and `;

            let currentUserId = jQuery(Constant.Page_bulletinBoard.Container.currentUserId).text();
            let filterOnlyMy = historyState.OnlyMy ? `CreatedBy/Id eq ${currentUserId} and ` : '';
            let filterOData = `&$filter=${filterCtegory}${filterOnlyMy}Status eq ${historyState.Status}`;

            var requestURL = "/_vti_bin/ListData.svc/" + Constant.SP_List.bulletin_DisplayName;
            var oDataQuery = "?&$select=Id" +
                filterOData;

            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + requestURL + oDataQuery,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log(data);
                    Variable.FilteredBulletinList_ItemCount = data.d.results.length;
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        get_Bulletins_byPaging: function () { // perform via /_vti_bin/

            // HistoryState: {
            //     Page: 1,
            //     Category: 'Any',
            //     OnlyMy: false,
            //     Status: Constant.SP_Enum.BulletinStatus.Approved
            // }
            let to = Variable.HistoryState.Page * Variable.Pagination_MaxPerPage;
            let from = to - Variable.Pagination_MaxPerPage + 1;

            let historyState = Variable.HistoryState;
            let filterCtegory = historyState.Category == 'Any' ? '' : ` and Category/Id eq ${historyState.Category}`;

            let currentUserId = jQuery(Constant.Page_bulletinBoard.Container.currentUserId).text();
            let filterOnlyMy = historyState.OnlyMy == "true" ? ` and CreatedBy/Id eq ${currentUserId}` : '';
            let filterOData = `&$filter=Status eq ${historyState.Status}${filterOnlyMy}${filterCtegory}`;

            var requestURL = "/_vti_bin/ListData.svc/" + Constant.SP_List.bulletin_DisplayName; //"/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items";
            var oDataQuery = "?&$select=Id,Title,Description,Attachments,PublicationDate,Status,Category/Id,Category/Title,CreatedBy/Name,CreatedBy/Id" +
                "&$orderby=PublicationDate desc" +
                filterOData + //`&$skip=${0}&$top=${5}`;
                "&$expand=Category,CreatedBy" +
                `&$skip=${from - 1}&$top=${Variable.Pagination_MaxPerPage}`;

            // !!!!!!!!!!!!
            // OData via /_vti_bin/
            // if request data, a response represents via 'data.d.results' array
            // BUT if OData consist $skip / $top (one of or both - didn't check) params - the response represents via 'data.d' array
            // SO
            // be careful this specific detail when perform response in 'success' awaiter
            // !!!!!!!!!!!!
            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + requestURL + oDataQuery,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log("Bulletins from server (by paging):");
                    console.log(data);
                    console.log(data.d);
                    Variable.List_bulletins = data.d.map(function (bulletin) {
                        let dateTicks = bulletin.PublicationDate ? parseInt(bulletin.PublicationDate.replace('/Date(', '').replace(')/', '')) : "";
                        let date = new Date(dateTicks);
                        return {
                            Id: bulletin.Id,
                            Title: bulletin.Title,
                            Description: bulletin.Description,
                            Category: {
                                Id: bulletin.Category.Id,
                                Title: bulletin.Category.Title
                            },
                            PublicationDate: bulletin.Status == Constant.SP_Enum.BulletinStatus.Pending ? "On moderation" : Helper.formatDateTime(date),
                            Author: {
                                Id: bulletin.CreatedBy.Id,
                                Name: bulletin.CreatedBy.Name,
                                Link: "",
                                FaceImg: ""
                            },
                            PreviewPhoto: "",
                            Status: bulletin.Status,
                            HasAttachments: bulletin.Attachments
                        };
                    });
                    console.log(Variable.List_bulletins);
                    Render.fill_bulletinsList();
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        get_BulletinAttachmetFiles: function (bulletinId, successHandlingFunc) {
            var urlForItem = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items(" + bulletinId + ")";
            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForItem + "/AttachmentFiles",
                method: "GET",
                headers: { "Accept": "application/json;odata=verbose" },
                success: function (data) {
                    successHandlingFunc(data);
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        add_Bulletin: function () {
            var title = jQuery(Constant.Page_bulletinCreation.Container.title).val();

            var description = jQuery(Constant.Page_bulletinCreation.Container.description).val();

            var categoryId = jQuery(Constant.Page_bulletinCreation.Container.categoriesSelect).val();

            var siteUrl = _spPageContextInfo.webAbsoluteUrl;
            var fullUrl = siteUrl + "/_api/web/lists/GetByTitle('Bulletin')/items";

            $.ajax({
                url: fullUrl,
                type: "POST",
                data: JSON.stringify({
                    '__metadata': { 'type': 'SP.Data.BulletinListItem' },
                    'AAATitle': title,
                    'AAADescription': description,
                    'AAACategoryId': categoryId
                }),
                headers: {
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                success: function (data) {
                    console.log(data);
                    Variable.BulletinId = data.d.Id;
                    CRUD.create_BulletinAttachment();
                },
                error: function (error) {
                    console.log(error);
                }
            });
        },

        update_Bulletin: function () {
            var title = jQuery(Constant.Page_bulletinEdit.Container.title).val();

            var description = jQuery(Constant.Page_bulletinEdit.Container.description).val();

            var categoryId = jQuery(Constant.Page_bulletinEdit.Container.categoriesSelect).val();

            var siteUrl = _spPageContextInfo.webAbsoluteUrl;
            var urlForItemById = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items(" + Variable.BulletinId + ")";

            $.ajax({
                url: siteUrl + urlForItemById,
                type: "POST",
                data: JSON.stringify({
                    '__metadata': { 'type': 'SP.Data.BulletinListItem' },
                    'AAATitle': title,
                    'AAADescription': description,
                    'AAACategoryId': categoryId,
                }),
                headers: {
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "PATCH",
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                success: function (data) {
                    console.log("updated bulletin: ");
                    console.log(data);
                    CRUD.update_BulletinAttachment();
                },
                error: function (error) {
                    console.log(error);
                }
            });
        },

        get_BulletinById_thenRenderAs_PageRead: function () {
            var urlForItemById = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items(" + Variable.BulletinId + ")";
            var oDataQuery = "?$select=ID,AAATitle,AAADescription,Attachments,AAACategory/AAATitle,AAAPublicationDate,AAAStatus,Author/Title,Author/Id,Author/EMail" +
                "&$expand=AAACategory,Author";
            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForItemById + oDataQuery,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log("Bulletin from server:");
                    console.log(data);
                    var bulletin = {
                        Id: data.d.ID,
                        Title: data.d.AAATitle,
                        PublicationDate: data.d.AAAStatus == Constant.SP_Enum.BulletinStatus.Pending ? "On moderation" : Helper.formatDateTime(data.d.AAAPublicationDate),
                        CategoryTitle: data.d.AAACategory.AAATitle,
                        Description: data.d.AAADescription,
                        Author: {
                            Id: data.d.Author.Id,
                            Name: data.d.Author.Title,
                            EMail: data.d.Author.EMail,
                            Link: "",
                            FaceImg: ""
                        },
                        Status: data.d.AAAStatus,
                        HasAttachments: data.d.Attachments
                    }
                    Render.fill_bulletin_asPageRead(bulletin);
                    Render.resolveRenderingDependencies(bulletin.Author.Id, bulletin.Author.EMail, bulletin.Status);
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },

        get_simpleBulletinById_thenRenderAs_PageEdit: function () {
            var urlForItemById = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items(" + Variable.BulletinId + ")";
            var oDataQuery = "?$select=ID,AAATitle,AAADescription,Attachments,AAACategory/AAATitle,AAACategory/Id,AAAStatus,Author/Id" +
                "&$expand=AAACategory,Author";
            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForItemById + oDataQuery,
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                },
                success: function (data) {
                    console.log("Bulletin from server:");
                    console.log(data);
                    var bulletin = {
                        Id: data.d.ID,
                        Title: data.d.AAATitle,
                        Category: {
                            Id: data.d.AAACategory.Id,
                            Title: data.d.AAACategory.AAATitle
                        },
                        Description: data.d.AAADescription,
                        AuthorId: data.d.Author.Id,
                        Status: data.d.AAAStatus,
                        HasAttachments: data.d.Attachments
                    }
                    //let currentUserId = jQuery(Constant.Page_bulletin.Container.currentUserId).text();
                    Render.fill_bulletin_asPageEdit(bulletin);
                    Render.setAsideBoxContent(bulletin.AuthorId, bulletin.Status);
                },
                error: function (error) {
                    alert(JSON.stringify(error));
                }
            });
        },


        create_BulletinAttachment: function () {
            //Files_forAttachments: [{ fileName: "", dataURL: ""}],
            let files = Variable.Files_forAttachments;
            let bulletinId = Variable.BulletinId;

            files.forEach(function (fileInfo) {
                var fileContent = Helper.makeblob(fileInfo.dataURL);
                var digest = $("#__REQUESTDIGEST").val();
                var composedUrl = "/_api/web/lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/items(" + bulletinId + ")/AttachmentFiles/add(FileName='" + fileInfo.fileName + "')";

                $.ajax({
                    url: composedUrl,
                    type: "POST",
                    processData: false,
                    contentType: 'application/octet-stream',
                    data: fileContent,
                    headers: {
                        "X-RequestDigest": digest
                    },
                    success: function (data) {
                        console.log(data);
                    },
                    error: function (error) {
                        console.log(error);
                    }
                });


            });
        },

        update_BulletinAttachment: function () {
            CRUD.create_BulletinAttachment();

            Variable.EditPage_AttachmentsToDelete.forEach(function (attachment) {
                CRUD.delete_BulletinAttachment(attachment.FileName);
            });
        },

        delete_BulletinAttachment: function (attachmentName) {
            var requestURL = _spPageContextInfo.webAbsoluteUrl + `/_api/web/lists/GetByTitle('${Constant.SP_List.bulletin_DisplayName}')/GetItemById(${Variable.BulletinId})/AttachmentFiles/getByFileName('${attachmentName}')`;

            $.ajax({
                url: requestURL,
                type: 'DELETE',
                contentType: 'application/json;odata=verbose',
                headers: {
                    'X-RequestDigest': $('#__REQUESTDIGEST').val(),
                    'X-HTTP-Method': 'DELETE',
                    'Accept': 'application/json;odata=verbose'
                },
                success: function (data) {
                    console.log(data);
                },
                error: function (error) {
                    console.log(JSON.stringify(error));
                }
            });
        },

        update_BulletinStatus: function (status) {
            var urlForItemById = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items(" + Variable.BulletinId + ")";

            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForItemById,
                type: "POST",
                data: JSON.stringify({
                    '__metadata': { 'type': 'SP.Data.BulletinListItem' },
                    'AAAStatus': status
                }),
                headers: {
                    "IF-MATCH": "*",
                    "X-HTTP-Method": "PATCH",
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                success: function () {
                    if (status == Constant.SP_Enum.BulletinStatus.Deleted) {
                        window.location.replace(_spPageContextInfo.webAbsoluteUrl + Constant.SP_URL.bulletinBoard);
                    }
                    else {
                        Render.set_AsideBox_message_ByStatus(status);
                        Render.set_ApprovingModeration_action_ByStatus(status);
                    }
                },
                error: function (error) {
                    console.log(error);
                }
            });
        },

        delete_bulletinById: function () {
            var urlForItemById = "/_api/Web/Lists/GetByTitle('" + Constant.SP_List.bulletin_DisplayName + "')/Items(" + Variable.BulletinId + ")";

            $.ajax({
                url: _spPageContextInfo.webAbsoluteUrl + urlForItemById,
                type: "DELETE",
                headers: {
                    "IF-MATCH": "*",
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                success: function () {
                    window.location.replace(_spPageContextInfo.webAbsoluteUrl + Constant.SP_URL.bulletinBoard);

                },
                error: function (error) {
                    console.log(error);
                }
            });
        }
    },

    Render = {
        fill_categoriesSelect: function (targetContainer) {
            Variable.List_categories.forEach(function (category) {
                var optionElement = document.createElement("option");
                optionElement.value = category.Id;
                optionElement.textContent = category.Title;

                $(targetContainer).append(optionElement);
            });
        },

        renderPagination: function () {
            let filterState = Variable.HistoryState;

            jQuery('.pager ul').empty();

            let liElement = document.createElement('li');
            let aElement = document.createElement('a');
            jQuery(liElement).append(aElement);

            let to = filterState.Page * Variable.Pagination_MaxPerPage;
            let from = to - Variable.Pagination_MaxPerPage + 1;
            for (let i = from; i <= to; from++) {

            }

        },

        fill_bulletinsList: function () {
            jQuery(Constant.Page_bulletinBoard.Container.list_Bulletins).empty();

            let currentUserId = jQuery(Constant.Page_bulletinBoard.Container.currentUserId).text();
            let template = document.querySelector(Constant.Page_bulletinBoard.Template.container).content.querySelector(Constant.Page_bulletinBoard.Template.content);
            Variable.List_bulletins
                // .filter(function (bulletin) {
                //     return bulletin.Status == Variable.Filter_Status
                //         && (Variable.Filter_Category == "Any" || Variable.Filter_Category == bulletin.Category.Id)
                //         && (Variable.Filter_ShowOnlyMyBulletins == false || bulletin.Author.Id == currentUserId)
                // })
                .forEach(function (bulletin) {
                    let bulletin_container = document.importNode(template, true);

                    if (bulletin.HasAttachments) {
                        let successHandling = function (data) {
                            console.log("attachment files: ")
                            console.log(data.d.results)
                            let imageURL = data.d.results[0].ServerRelativeUrl;
                            bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.sourcePathToImage).src = imageURL;
                        }

                        CRUD.get_BulletinAttachmetFiles(bulletin.Id, successHandling);
                    }
                    else {
                        let imageURL = "/_catalogs/masterpage/Content/img/camera.svg";
                        bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.sourcePathToImage).src = imageURL;
                    }

                    let date = bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.date);
                    date.textContent = bulletin.PublicationDate;

                    let category = bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.status);
                    category.textContent = bulletin.Category.Title;

                    let bulletinName = bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.bulletinName);
                    bulletinName.textContent = bulletin.Title;

                    let authorName = bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.authorName);
                    authorName.textContent = bulletin.Author.Name;

                    let linkToBulletin = _spPageContextInfo.webAbsoluteUrl + Constant.SP_URL.bulletin + "?BulletinId=" + bulletin.Id;
                    let linkToAuthorProfile = "/_layouts/15/userdisp.aspx?ID=" + bulletin.Author.Id;
                    bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.linkToBulletin_viaImg).href = linkToBulletin;
                    bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.linkToBulletin_viaTitle).href = linkToBulletin;
                    bulletin_container.querySelector(Constant.Page_bulletinBoard.Template.linkToAuthorProfile).href = linkToAuthorProfile;

                    jQuery(Constant.Page_bulletinBoard.Container.list_Bulletins).append(bulletin_container);

                });
        },

        fill_bulletin_asPageRead: function (bulletin) {
            document.querySelector(Constant.Page_bulletin.Container.title).textContent = bulletin.Title;
            document.querySelector(Constant.Page_bulletin.Container.date_and_Category).textContent = bulletin.PublicationDate + " · " + bulletin.CategoryTitle;
            document.querySelector(Constant.Page_bulletin.Container.authorName).textContent = bulletin.Author.Name;
            document.querySelector(Constant.Page_bulletin.Container.descriprion).textContent = bulletin.Description;

            let template = document.querySelector(Constant.Page_bulletin.Template.galleryImage).content.querySelector("div");

            if (bulletin.HasAttachments) {
                let successHandling = function (data) {
                    console.log("attachment files: ")
                    console.log(data.d.results)
                    var imagesURLs = data.d.results.map(function (attachment) {
                        return {
                            url: attachment.ServerRelativeUrl
                        }
                    });
                    imagesURLs.forEach(function (item) {
                        let galleryImageContainer = document.importNode(template, true);

                        let image = galleryImageContainer.querySelector(Constant.Page_bulletin.Template.galleryImage_ImageContainer);
                        image.src = item.url;

                        jQuery(Constant.Page_bulletin.Template.appendTo).append(galleryImageContainer);
                    })
                }

                CRUD.get_BulletinAttachmetFiles(bulletin.Id, successHandling)

            }
        },

        fill_bulletin_asPageEdit: function (bulletin) {
            jQuery(Constant.Page_bulletinEdit.Container.title).val(bulletin.Title);

            jQuery(Constant.Page_bulletinEdit.Container.description).val(bulletin.Description)

            jQuery(`${Constant.Page_bulletinEdit.Container.categoriesSelect} option[value=${bulletin.Category.Id}]`).prop("selected", true);

            //declare template
            let template = document.querySelector(Constant.Page_bulletinEdit.Template.templateContainer).content.querySelector("span");

            if (bulletin.HasAttachments) {
                let successHandling = function (data) {
                    console.log("attachment files: ")
                    console.log(data.d.results)
                    Variable.EditPage_LoadedAttachments = data.d.results.map(function (attachment) {
                        return {
                            FileName: attachment.FileName,
                            URL: attachment.ServerRelativeUrl
                        }
                    });
                    Variable.EditPage_LoadedAttachments.forEach(function (item) {
                        let anImageContainer = document.importNode(template, true);

                        let image = anImageContainer.querySelector("img");
                        image.src = item.URL;

                        image.setAttribute('title', item.FileName);

                        let btnDelete = anImageContainer.querySelector("span .delete-image");
                        btnDelete.setAttribute('data-attachmentId', item.FileName);


                        jQuery(Constant.Page_bulletinEdit.Template.appendTo).append(anImageContainer);
                    })

                    Render.resolveRenderingUploadFilesButton();
                }

                CRUD.get_BulletinAttachmetFiles(bulletin.Id, successHandling)

            }
        },

        resolveRenderingUploadFilesButton: function () {
            if (Variable.EditPage_LoadedAttachments.length == Variable.Max_Attachments_Count) {
                $('#file4').prop("disabled", true);
            }
            else {
                $('#file4').prop("disabled", false);
            }
        },

        resolveRenderingDependencies: function (bulletinAurhorId, bulletinAuthorEmail, bulletinStatus) {
            Render.setAsideBoxContent(bulletinAurhorId, bulletinStatus);

            Render.setLinkToUserProfileById(bulletinAurhorId);
            Render.setLinkMailToAuthorByEmail(bulletinAuthorEmail);
        },

        setAsideBoxContent: function (bulletinAuthorId, bulletinStatus) {
            let currentUserId = jQuery(Constant.Page_bulletin.Container.currentUserId).text();

            let currentUserIsModerator = jQuery(Constant.Page_bulletin.Container.currentUserIsModerator).text() === "True";
            let currentUserIsOwner = currentUserId == bulletinAuthorId;
            let currentUserIsNotOwnerAndNotModerator = !currentUserIsOwner && !currentUserIsModerator;

            if (currentUserIsNotOwnerAndNotModerator) {
                jQuery(".birthday-box").css("display", "block");
            }
            else {
                jQuery(".news-archive").css("display", "block");

                if (currentUserIsModerator) {
                    Render.set_ApprovingModeration_action_ByStatus(bulletinStatus);
                }
                Render.set_AsideBox_message_ByStatus(bulletinStatus);
            }
        },

        set_AsideBox_message_ByStatus: function (status) {
            let statusMessage;
            switch (status) {
                case Constant.SP_Enum.BulletinStatus.Approved:
                    statusMessage = "Объявление опубликовано";
                    break;
                case Constant.SP_Enum.BulletinStatus.Pending:
                    statusMessage = "Объявление на модерации";
                    break;
                case Constant.SP_Enum.BulletinStatus.Archived:
                    statusMessage = "Объявление в архиве";
                    break;
                default:
                    statusMessage = "{{Status message}}";
                    break;
            }

            jQuery("#aside-title-statusMessage").text(statusMessage);
        },

        set_ApprovingModeration_action_ByStatus: function (status) {
            if (status == Constant.SP_Enum.BulletinStatus.Pending) {
                jQuery(Constant.Page_bulletin.Container.action_moderation).css("display", "none");
                jQuery(Constant.Page_bulletin.Container.action_approve).css("display", "inline-block");
            }
            else if (status == Constant.SP_Enum.BulletinStatus.Approved) {
                jQuery(Constant.Page_bulletin.Container.action_approve).css("display", "none");
                jQuery(Constant.Page_bulletin.Container.action_moderation).css("display", "inline-block");
            }
            else {
                jQuery(Constant.Page_bulletin.Container.action_approve).css("display", "none");
                jQuery(Constant.Page_bulletin.Container.action_moderation).css("display", "none");
            }
        },

        setLinkToUserProfileById: function (id) {
            document.querySelector(Constant.Page_bulletin.Container.linkToAuthorProfile).href = "/_layouts/15/userdisp.aspx?ID=" + id;
        },

        setLinkMailToAuthorByEmail: function (email) {
            document.querySelector(Constant.Page_bulletin.Container.linkMailToAuthor).href = "mailto:" + email;
        },

    }
}

function performUtilityLogic() {
    Helper = {
        formatDateTime: function (dateTime) {
            const d = new Date(dateTime)
            const ye = new Intl.DateTimeFormat('ru', { year: 'numeric' }).format(d)
            const mo = new Intl.DateTimeFormat('ru', { month: 'long' }).format(d)
            const da = new Intl.DateTimeFormat('ru', { day: '2-digit' }).format(d)

            const dateNow = new Date().getTime();
            const yearNow = new Intl.DateTimeFormat('ru', { year: 'numeric' }).format(dateNow)

            if (yearNow == ye) {
                return `${da} ${mo}`
            }
            else {
                return `${da} ${mo} ${ye}`
            }
        },

        files_handleFileSelect: function (evt) {
            Variable.Files_forAttachments = [];
            jQuery("#outputMulti").empty();

            var files = evt.target.files; // FileList object
            // Loop through the FileList and render image files as thumbnails.
            for (var i = 0, f; f = files[i]; i++) {
                if (i + 1 > Variable.Max_Attachments_Count) {
                    break;
                }
                // Only process image files.
                if (!f.type.match('image.*')) {
                    break;
                }
                var reader = new FileReader();
                // Closure to capture the file information.
                reader.onload = (function (theFile) {
                    return function (e) {
                        // Render thumbnail.
                        var span = document.createElement('span');
                        span.innerHTML = ['<img class="thumb" title="', escape(theFile.name), '" src="', e.target.result, '" />'].join('');
                        document.getElementById('outputMulti').insertBefore(span, null);

                        //dataURL (base64)
                        Variable.Files_forAttachments.push({ fileName: Helper.files_getUniqueFileName(theFile.name), dataURL: e.target.result });
                    };
                })(f);
                // Read in the image file as a data URL.
                reader.readAsDataURL(f);
            }
        },

        files_handleFileSelect_EditPage: function (evt) {
            Variable.Files_forAttachments = [];
            let maxToUpload = Variable.Max_Attachments_Count - Variable.EditPage_LoadedAttachments.length;
            var files = evt.target.files; // FileList object
            // Loop through the FileList and render image files as thumbnails.
            for (var i = 0, f; f = files[i]; i++) {
                if (i > maxToUpload) {
                    break;
                }
                // Only process image files.
                if (!f.type.match('image.*')) {
                    break;
                }
                var reader = new FileReader();
                // Closure to capture the file information.
                reader.onload = (function (theFile) {
                    return function (e) {
                        // Render thumbnail.
                        var span = document.createElement('span');
                        span.innerHTML = ['<img class="thumb" title="', escape(theFile.name), '" src="', e.target.result, '" />'].join('')
                            + `<a href="#" class="delete-image" data-attachmentId="${theFile.name}" data-from="UI"></a>`;
                        document.getElementById('outputMulti').insertBefore(span, null);

                        //dataURL (base64)
                        Variable.Files_forAttachments.push({ fileName: Helper.files_getUniqueFileName(theFile.name), dataURL: e.target.result });
                    };
                })(f);
                // Read in the image file as a data URL.
                reader.readAsDataURL(f);
                Variable.EditPage_LoadedAttachments.push({ FileName: f.name, URL: "" });
            }
            Render.resolveRenderingUploadFilesButton();
        },
        files_getUniqueFileName: function (fileName) {
            let separateName = fileName.split('.');
            return `${separateName[0]}-${Date.now()}.${separateName[1]}`;
        },
        extractParamIdFromCurrentPath: function () {
            //substring(1) extract path after '?' symbol
            let params = new URLSearchParams(window.location.search.substring(1))
            let id = params.get("BulletinId");
            return id;
        },

        isPage: function (url) {
            return window.location.pathname.includes(url);
        },
        get_SearchPath_byHistoryState: function () {
            let state = Variable.HistoryState;
            return `#Page=${state.Page}&Category=${state.Category}&OnlyMy=${state.OnlyMy}&Status=${state.Status}`;
        },
        set_HistoryState_bySearchPath: function () {
            let params = new URLSearchParams(window.location.hash.substring(1));
            Variable.HistoryState = {
                Page: params.get("Page"),
                Category: params.get("Category"),
                OnlyMy: params.get("OnlyMy"),
                Status: params.get("Status")
            };
        },
        makeblob: function (dataURL) {
            var BASE64_MARKER = ';base64,';
            if (dataURL.indexOf(BASE64_MARKER) == -1) {
                var parts = dataURL.split(',');
                var contentType = parts[0].split(':')[1];
                var raw = decodeURIComponent(parts[1]);
                return new Blob([raw], { type: contentType });
            }

            var parts = dataURL.split(BASE64_MARKER);
            var contentType = parts[0].split(':')[1];
            var raw = window.atob(parts[1]);
            var rawLength = raw.length;

            var uInt8Array = new Uint8Array(rawLength);

            for (var i = 0; i < rawLength; ++i) {
                uInt8Array[i] = raw.charCodeAt(i);
            }

            return new Blob([uInt8Array], { type: contentType });
        },
    };

    EventReg = {
        Page_bulletinBoard: {
            onClick_Button_creationNewBulletin: function () {
                jQuery(Constant.Page_bulletinBoard.Container.button_creationNewBulletin).on('click', function (event) {
                    event.preventDefault();
                    window.location.assign(_spPageContextInfo.webAbsoluteUrl + Constant.SP_URL.bulletinCreation);
                });
            },

            onClick_Button_Filter_StatusApproved: function () {
                jQuery(Constant.Page_bulletinBoard.Container.filter_status_approved).on('click', function (event) {
                    event.preventDefault();

                    Variable.Filter_Status = Constant.SP_Enum.BulletinStatus.Approved;


                    //Render.fill_bulletinsList();
                    Variable.HistoryState.Status = Variable.Filter_Status;

                    window.location.hash = Helper.get_SearchPath_byHistoryState();
                });
            },

            onClick_Button_Filter_StatusPending: function () {
                jQuery(Constant.Page_bulletinBoard.Container.filter_status_pending).on('click', function (event) {
                    event.preventDefault();

                    Variable.Filter_Status = Constant.SP_Enum.BulletinStatus.Pending;

                    //Render.fill_bulletinsList();
                    Variable.HistoryState.Status = Variable.Filter_Status;

                    window.location.hash = Helper.get_SearchPath_byHistoryState();
                });
            },

            onChange_Select_Filter_Categories: function () {
                jQuery(Constant.Page_bulletinBoard.Container.filter_selectCategories).on('change', function (event) {

                    let filteredCategoryValue = jQuery(Constant.Page_bulletinBoard.Container.filter_selectCategories).val();

                    Variable.Filter_Category = filteredCategoryValue;

                    //Render.fill_bulletinsList();
                    Variable.HistoryState.Category = Variable.Filter_Category;

                    window.location.hash = Helper.get_SearchPath_byHistoryState();
                });
            },

            onChange_Checkbox_Filter_ShowOnlyMyBulletins: function () {
                jQuery(Constant.Page_bulletinBoard.Container.filter_onlyCurrentUser).on('change', function (event) {

                    Variable.Filter_ShowOnlyMyBulletins = jQuery(Constant.Page_bulletinBoard.Container.filter_onlyCurrentUser).prop("checked");

                    //Render.fill_bulletinsList();
                    Variable.HistoryState.OnlyMy = Variable.Filter_ShowOnlyMyBulletins;

                    window.location.hash = Helper.get_SearchPath_byHistoryState();
                });
            },

            onClick_Button_Pagination: function () {
                jQuery(Constant.Page_bulletinBoard.Container.pager_button).on('click', function (event) {
                    event.preventDefault();

                    let page = event.target.getAttribute('data-page');
                    if (page == 'next') {
                        page = Variable.HistoryState.Page + 1;
                    }
                    Variable.HistoryState.Page = page;

                    window.location.hash = Helper.get_SearchPath_byHistoryState();
                });
            },

            onHashChange_windowEventHandler: function () {
                let locationHashChanged = function () {
                    Helper.set_HistoryState_bySearchPath();

                    CRUD.get_Bulletins_byPaging();
                }

                window.onhashchange = locationHashChanged;

                // window.addEventListener('hashchange', 
                //     function(){

                //         Variable.HistoryState = Helper.get_HistoryState_bySearchPath(); 

                //         CRUD.get_Bulletins_byPaging();
                //     }
                //     , false);
            }
        },

        Page_bulletin: {
            onClick_Button_Action_approve: function () {
                jQuery(Constant.Page_bulletin.Container.action_approve).on("click", function (event) {
                    event.preventDefault();

                    CRUD.update_BulletinStatus(Constant.SP_Enum.BulletinStatus.Approved);
                });
            },

            onClick_Button_Action_modeartion: function () {
                jQuery(Constant.Page_bulletin.Container.action_moderation).on("click", function (event) {
                    event.preventDefault();

                    CRUD.update_BulletinStatus(Constant.SP_Enum.BulletinStatus.Pending);
                });
            },

            onClick_Button_Action_edit: function () {
                jQuery(Constant.Page_bulletin.Container.action_edit).on("click", function (event) {
                    event.preventDefault();

                    window.location.assign(`${_spPageContextInfo.webAbsoluteUrl}${Constant.SP_URL.bulletinEdit}?BulletinId=${Variable.BulletinId}`);
                });
            },

            onClick_Button_Action_archive: function () {
                jQuery(Constant.Page_bulletin.Container.action_archive).on("click", function (event) {
                    event.preventDefault();

                    CRUD.update_BulletinStatus(Constant.SP_Enum.BulletinStatus.Archived);
                });
            },

            onClick_Button_Action_delete: function () {
                jQuery(Constant.Page_bulletin.Container.action_delete).on("click", function (event) {
                    event.preventDefault();

                    CRUD.delete_bulletinById();
                });
            },
        },

        Page_bulletinCreation: {
            onClick_Button_Submit: function () {
                jQuery(Constant.Page_bulletinCreation.Container.submit).on('click', function (event) {
                    event.preventDefault();

                    try {
                        jQuery.ajaxSetup({ async: false });
                        CRUD.add_Bulletin();
                    }
                    finally {
                        //get back async ajax
                        jQuery.ajaxSetup({ async: true });
                    }

                    window.location.replace(_spPageContextInfo.webAbsoluteUrl + Constant.SP_URL.bulletinBoard);
                });
            },

            onChange_FileUpload: function () {
                //document.getElementById('file4').addEventListener('change', Helper.files_handleFileSelect, false);

                jQuery('#file4').on('change', Helper.files_handleFileSelect);
            },
        },

        Page_bulletinEdit: {
            onClick_Button_Submit: function () {
                jQuery(Constant.Page_bulletinEdit.Container.submit).on('click', function (event) {
                    event.preventDefault();

                    try {
                        jQuery.ajaxSetup({ async: false });

                        CRUD.update_Bulletin();
                    }
                    finally {
                        //get back async ajax
                        jQuery.ajaxSetup({ async: true });
                    }

                    window.location.replace(_spPageContextInfo.webAbsoluteUrl + Constant.SP_URL.bulletinBoard);
                });
            },

            onChange_FileUpload: function () {
                jQuery('#file4').on('change', function (event) {
                    Helper.files_handleFileSelect_EditPage(event);
                });
            },

            onClick_Button_DeleteAttachment: function () {
                jQuery(Constant.Page_bulletinEdit.Template.appendTo).on("click", "a", {}, function (event) {
                    let fileName = event.target.getAttribute('data-attachmentId');
                    let dataFrom = event.target.getAttribute('data-from');

                    if (dataFrom === "server") {

                        let filteredAttachments = Variable.EditPage_LoadedAttachments.filter(function (item) {
                            return item.FileName == fileName;
                        });

                        Variable.EditPage_AttachmentsToDelete.push(filteredAttachments[0]);

                    }
                    Variable.EditPage_LoadedAttachments = Variable.EditPage_LoadedAttachments.filter(function (item) {
                        return fileName != item.FileName;
                    });

                    //remove an item by filter
                    $(event.target.parentNode).remove();

                    Render.resolveRenderingUploadFilesButton();
                });
            },

            onClick_Button_Action_approve: function () {
                jQuery(Constant.Page_bulletin.Container.action_approve).on("click", function (event) {
                    event.preventDefault();

                    CRUD.update_BulletinStatus(Constant.SP_Enum.BulletinStatus.Approved);
                });
            },

            onClick_Button_Action_modeartion: function () {
                jQuery(Constant.Page_bulletin.Container.action_moderation).on("click", function (event) {
                    event.preventDefault();

                    CRUD.update_BulletinStatus(Constant.SP_Enum.BulletinStatus.Pending);
                });
            },

            onClick_Button_Action_archive: function () {
                jQuery(Constant.Page_bulletin.Container.action_archive).on("click", function (event) {
                    event.preventDefault();

                    CRUD.update_BulletinStatus(Constant.SP_Enum.BulletinStatus.Archived);
                });
            },

            onClick_Button_Action_delete: function () {
                jQuery(Constant.Page_bulletin.Container.action_delete).on("click", function (event) {
                    event.preventDefault();

                    CRUD.delete_bulletinById();
                });
            },
        }
    };
}

function declareVarConst() {

    Constant = {
        SP_URL: {
            bulletinBoard: "/SitePages/board.aspx",
            bulletin: "/SitePages/bulletin.aspx",
            bulletinCreation: "/SitePages/bulletin-creation.aspx",
            bulletinEdit: "/SitePages/bulletin-edit.aspx"
        },

        SP_List: {
            bulletin_DisplayName: "Bulletin",
            categories_DisplayName: "Categories",
        },

        SP_Enum: {
            BulletinStatus: {
                Pending: 0,

                Rejected: 5,

                Approved: 10,

                Deleted: 20,

                Archived: 25
            }
        },

        Page_bulletinBoard: {
            Container: {
                button_creationNewBulletin: "#gotoCreationNewBulletin",
                list_Bulletins: ".news-box",
                pager: ".pager",
                pager_button: `.pager ul a`,
                currentUserId: "#currentUserId span",

                filter_selectCategories: "#Filter-selectCategories",
                filter_status_approved: "#Filter-status-approved",
                filter_status_pending: "#Filter-status-pending",
                filter_onlyCurrentUser: ".Filter-checkbox-onlyCurrentUser",
            },

            Template: {
                container: "#template-news",
                content: ".news-item",
                date: ".date",
                status: ".status",
                bulletinName: ".name a",
                authorName: ".n",
                linkToBulletin_viaImg: ".img a",
                linkToBulletin_viaTitle: ".name a",
                sourcePathToImage: ".img a img",
                linkToAuthorProfile: ".ico-name a",
            }
        },

        Page_bulletinCreation: {
            Container: {
                title: ".row-inp input[type='text']",
                categoriesSelect: ".cat-select",
                description: ".row-inp textarea",
                submit: ".row-inp input[type='submit']",
            },
        },

        Page_bulletin: {
            Container: {
                title: ".title",
                date_and_Category: ".date",
                authorName: ".who .name",
                linkToAuthorProfile: ".who a",
                linkMailToAuthor: ".text a",
                descriprion: "#description",
                currentUserId: "#currentUserId span",
                currentUserIsModerator: "#currentUserIsModerator span",

                action_approve: "#action-approve",
                action_moderation: "#action-moderation",
                action_edit: "#action-edit",
                action_archive: "#action-archive",
                action_delete: "#action-delete"
            },

            Template: {
                galleryImage: "#template-galleryImage",
                galleryImage_ImageContainer: "a img",
                appendTo: ".desk-photos",
            }
        },

        Page_bulletinEdit: {
            Container: {
                title: ".row-inp input[type='text']",
                categoriesSelect: ".cat-select",
                description: ".row-inp textarea",
                submit: ".row-inp input[type='submit']",
            },

            Template: {
                templateContainer: "#template-editPage-image-attachment",
                appendTo: "#outputMulti",
            }
        }
    };

    Variable = {
        List_bulletins: [],
        List_categories: [],

        BulletinList_ItemCount: 0,
        FilteredBulletinList_ItemCount: 0,
        Pagination_MaxPerPage: 5,
        Pagination_MaxPagiationButtons: 5,

        Max_Attachments_Count: 3,
        Files_forAttachments: [],

        Filter_Status: Constant.SP_Enum.BulletinStatus.Approved,
        Filter_Category: "Any",
        Filter_ShowOnlyMyBulletins: false,

        BulletinId: 0,

        EditPage_LoadedAttachments: [],
        EditPage_AttachmentsToDelete: [],

        HistoryState: {
            Page: 1,
            Category: 'Any',
            OnlyMy: false,
            Status: Constant.SP_Enum.BulletinStatus.Approved
        },
    };
}
