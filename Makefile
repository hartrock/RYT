# Makefile
# For use with Git repository.
#
# Used stuff with some dependencies ('->')
# ----------------------------------------
# mandatory:
#   tools GNU       : bash, make, sed;
#   tools           : git, java;
#   ./:
#     config.src <- needed variables;
#   Scripts/:
#     yesNoQuestion,
#     setPassword,
#     fillIn_dataDir, fillIn_adminPassword, createVersionHTML,
#     minifyDownFrom -> (Tools/yuicompressor-2.4.6.jar -> java).
#
# optional (make webside):
#   Scripts/:
#     fillInScreenshots -> ImageMagick.
#
# optional (push to external server):
#   FTP: lftp
#   Scripts/:
#     fillIn_lftpInfo

THIS_FILE := $(lastword $(MAKEFILE_LIST))
THIS_DIR := $(dir $(THIS_FILE))

ifneq ($(THIS_DIR),./)
  $(error Makefile called from wrong directory (has to be $(THIS_DIR)))
endif

SCRIPT_DIR := Scripts

#

# [to be included from config.src]..

# set vars now
include config.src

# fallback for unset vars
# mandatory
INSTALL_DIR             ?= $(error var INSTALL_DIR missing)
WWW_USER_ID             ?= $(error var WWW_USER_ID missing)
WWW_SERVER_DIR          ?= $(error var WWW_SERVER_DIR missing)
WWW_SERVER_URL          ?= $(error var WWW_SERVER_URL missing)
WWW_RYT_PATH            ?= $(error var WWW_RYT_PATH missing)
# optional
RYT_DIRNAME             ?= $(error var RYT_DIRNAME missing)
RYT_DATA_DIRNAME        ?= $(error var RYT_DATA_DIRNAME missing)
RYT_DATA_DIR_NESTING    ?= $(error var RYT_DATA_DIR_NESTING missing)
# technical
CONFIG_HAS_BEEN_SOURCED ?= $(error var CONFIG_HAS_BEEN_SOURCED missing)

# ..[to be included from config.src]

# repo (to be changed to master later)
RELEASE_BRANCH  := master
CURRENT_VERSION := $(shell git tag | tail -n 1)

# static paths
RYT_DIR       := $(INSTALL_DIR)/$(RYT_DIRNAME)
RYT_DATA_DIR  := $(INSTALL_DIR)/$(RYT_DATA_DIRNAME)
# static sub of RYT_DIR
ADMIN_DIR     := $(RYT_DIR)/Admin
DEVEL_DIR     := $(RYT_DIR)/Devel
# static html files in RYT_DIR
MAIN_HTML_NAME              := app.html
MAIN_UNMINIFIED_HTML_NAME   := app_unminified.html
DEVEL_HTML_NAME             := devel.html
DEVEL_HTML                  := $(RYT_DIR)/$(DEVEL_HTML_NAME)
MAIN_HTML                   := $(RYT_DIR)/$(MAIN_HTML_NAME)
MAIN_UNMINIFIED_HTML        := $(RYT_DIR)/$(MAIN_UNMINIFIED_HTML_NAME)
# 'dynamic' paths (dependent from current version)
RELEASE_DIRNAME             := Rel_$(CURRENT_VERSION)
RELEASE_DIR                 := $(RYT_DIR)/$(RELEASE_DIRNAME)
VERSION_HTML_NAME           := $(CURRENT_VERSION).html
VERSION_UNMINIFIED_HTML_NAME:= $(CURRENT_VERSION)_unminified.html
VERSION_HTML                := $(RYT_DIR)/$(VERSION_HTML_NAME)
VERSION_UNMINIFIED_HTML     := $(RYT_DIR)/$(VERSION_UNMINIFIED_HTML_NAME)

#
WWW_SRC_DIR := WWW
WWW_DST_DIR := $(RYT_DIR)

SOUNDS_DIR := $(WWW_DST_DIR)/Sounds
SOUNDS_SRC := $(wildcard $(WWW_SRC_DIR)/Sounds/*.wav)
SOUNDS_DST := $(patsubst $(WWW_SRC_DIR)/%,$(WWW_DST_DIR)/%,$(SOUNDS_SRC))

WWW_FOR_APP := $(SOUNDS_DST) $(WWW_DST_DIR)/marble.ico

VERSION_TEMPLATE := $(WWW_SRC_DIR)/version.html.tp

# public sources
SOURCES_JS          := $(wildcard *.js)
SOURCES_CSS         := $(wildcard *.css)
SOURCES_PHP5_PUBLIC := util.php5
SOURCE_DIRS_PUBLIC  := External
TARGETS_PUBLIC      := data.php5

# admin specific sources (PHP5)
TARGETS_ADMIN := m_listDirs.php5 m_createDirPaths.php5
SOURCES_ADMIN := $(filter-out $(TARGETS_ADMIN),$(wildcard m_*.php5)) util.php5 \
   phpInfo.php5 phpInfo.php

TO_BE_COPIED_PUBLIC := $(SOURCES_JS) $(SOURCES_CSS) \
                       $(SOURCES_PHP5_PUBLIC) $(SOURCE_DIRS_PUBLIC) \
                       $(TARGETS_PUBLIC)
TO_BE_COPIED_ADMIN  := $(SOURCES_ADMIN) $(TARGETS_ADMIN)

MAINTENANCE_ALLOWED_FLAG_FILE := $(ADMIN_DIR)/maintenanceAllowed.flag

# lftp
TMP_DIR := tmp
TARGETS_LFTP := $(SCRIPT_DIR)/uploadRYT.lftp $(SCRIPT_DIR)/uploadRYTDeleteOld.lftp $(SCRIPT_DIR)/pullPublicProjects.lftp
$(SCRIPT_DIR)/pullPublicProjects.lftp: $(TMP_DIR)

# devel
TARGETS_QUERY          := $(SCRIPT_DIR)/numOfProjects $(SCRIPT_DIR)/numOfKeys
TARGETS_QUERY_EXTERNAL := $(SCRIPT_DIR)/external_numOfProjects $(SCRIPT_DIR)/external_numOfKeys
TARGETS_DEVEL          := $(SCRIPT_DIR)/cleanOldReleases

TARGETS_ALL            := $(TARGETS_PUBLIC) $(TARGETS_ADMIN) $(TARGETS_QUERY) $(TARGETS_QUERY_EXTERNAL) $(TARGETS_LFTP) $(TARGETS_DEVEL)


#
# targets
#

all: usage

$(WWW_FOR_APP): $(SOUNDS_DIR)

clean:
	rm -f $(TARGETS_ALL) $(TMP_DIR)/*

# make
#

define getPWOnce
  $(eval $(if $(PASSWORD),,PASSWORD:=$(shell $(SCRIPT_DIR)/setPassword)))
endef

# for deps from Makefile
$(THIS_FILE): config.src
	touch $@ # update for deps from $(THIS_FILE) and ..
	$(MAKE) -f $(THIS_FILE) clean # .. to avoid endless recursion.

$(TARGETS_ALL): $(THIS_FILE)
targets: $(TARGETS_ALL)
	@echo "==> $@ succeeded."

#
$(SCRIPT_DIR)/cleanOldReleases: $(SCRIPT_DIR)/cleanOldReleases.in
	sed -e "s%_RYT_DIR_%$(RYT_DIR)%" $< > $@
	chmod u+x $@

# only data dir
m_createDirPaths.php5: m_createDirPaths.php5.in
	$(SCRIPT_DIR)/fillIn_dataDir $< $(RYT_DATA_DIRNAME) > $@

# data dir and admin password
.INTERMEDIATE: %.php5.in.withDataDir
%.php5.in.withDataDir: %.php5.in
	$(SCRIPT_DIR)/fillIn_dataDir $< $(RYT_DATA_DIRNAME) > $@
%.php5: %.php5.in.withDataDir
	$(call getPWOnce)
	$(SCRIPT_DIR)/fillIn_adminPassword $< $(PASSWORD) > $@


%.html: Rel_%
# $(<F) -> file-within-directory part of $<
# no URL_PARAM and set --minified flag (default)
	$(SCRIPT_DIR)/createVersionHtml $(<F) < $(VERSION_TEMPLATE) > $@
	$(SCRIPT_DIR)/fillInCopyrightInfo $(CURRENT_VERSION) $@

%_unminified.html: Rel_%
# empty URL_PARAM (needed for effect of --unminified) and set --unminified flag
	$(SCRIPT_DIR)/createVersionHtml $(<F) "" --unminified < $(VERSION_TEMPLATE) > $@
	$(SCRIPT_DIR)/fillInCopyrightInfo $(CURRENT_VERSION) $@


# devel access
#

DEVEL_URL_PARAM := ?avoidCaching=`date '+%s'`
$(DEVEL_DIR):
	ln -s `pwd` $(DEVEL_DIR)
# set symlink to data dir two levels up
	ln -s $(RYT_DATA_DIR) ../..
$(DEVEL_HTML): $(DEVEL_DIR) FORCE # forced for getting new URL param
	$(SCRIPT_DIR)/createVersionHtml $(<F) $(DEVEL_URL_PARAM) --unminified < $(VERSION_TEMPLATE) > $@
devel: $(THIS_FILE) $(DEVEL_HTML) targets
	@echo "==> $@ succeeded."
	@echo ">> RYT can be started by:"
	@echo ">>   $(DEVEL_HTML_URL)"
	@echo ">> ."


# install
#

# standard dir creation
$(RYT_DIR) $(ADMIN_DIR) $(SOUNDS_DIR) $(TMP_DIR):
	mkdir -p $@
#touch $@/ # make it current even if it has been existed
$(RYT_DATA_DIR):
	mkdir -p $@
#sudo touch $@/ # make it current even if it has been existed
	sudo chown $(WWW_USER_ID) $@ # make it writable for WWW user (webserver)
$(WWW_SERVER_DIR)/$(RYT_DIRNAME): $(RYT_DIR)
	ln -f -s $(RYT_DIR) $(WWW_SERVER_DIR)

# release install
checkForReleaseBranch:
	# check that we are at the release branch
	git branch | grep '* $(RELEASE_BRANCH)'
getCurrentVersion:
	@echo ">> $(CURRENT_VERSION)"
	@echo "==> $@ succeeded."
# get current release from repo

$(RELEASE_DIR):
	mkdir -p $@ # RELEASE_DIR first set after knowing CURRENT_VERSION!
	touch $@/
copiedRelease: $(RELEASE_DIR) $(TO_BE_COPIED_PUBLIC)
	rm -fR $(RELEASE_DIR)/* # start clean (e.g. avoid creating minified minified...)
	cp -fR $(TO_BE_COPIED_PUBLIC) $(RELEASE_DIR)
minifiedRelease: copiedRelease
	$(SCRIPT_DIR)/minifyDownFrom $(RELEASE_DIR)
versionHtml: $(VERSION_HTML) $(VERSION_UNMINIFIED_HTML)

release: $(THIS_FILE) checkForReleaseBranch minifiedRelease versionHtml

installRelease: release $(WWW_FOR_APP)
	cp $(VERSION_HTML) $(MAIN_HTML)
	cp $(VERSION_UNMINIFIED_HTML) $(MAIN_UNMINIFIED_HTML)
	@echo -e ">>\n>> [$(THIS_FILE)] Installation of current release $(CURRENT_VERSION) succeeded!\n>>"
	@echo "==> $@ succeeded."

# admin install
installAdminStuff: $(THIS_FILE) \
                   checkForReleaseBranch \
                   $(ADMIN_DIR) $(TO_BE_COPIED_ADMIN)
	rm -fR  $(ADMIN_DIR)/* # start clean
	cp -fR $(TO_BE_COPIED_ADMIN) $(ADMIN_DIR)
	echo "Hello World!" > $(ADMIN_DIR)/index.html

installWithoutInit: installAdminStuff installRelease targets
	@echo "==> $@ succeeded."
install: installWithoutInit init
	@echo "==> $@ succeeded."
	@echo ">> RYT can be started by:"
	@echo ">>   $(MAIN_HTML_URL)"
	@echo ">> or"
	@echo ">>   $(MAIN_UNMINIFIED_HTML_URL) (unminified)."
	@echo ">> Admin password can be found in targets:"
	@echo ">>   $(TARGETS_PUBLIC) $(TARGETS_ADMIN)"
	@echo ">> ."

upgrade: installWithoutInit updatePublicProjects
	@echo "==> $@ succeeded."

cleanDevel:
	rm -f ../../$(RYT_DATA_DIRNAME) $(DEVEL_DIR) # remove *symbolic* links
	rm -f $(DEVEL_HTML) # remove devel.html
	@echo "==> $@ succeeded."
cleanInstall: cleanDevel
	@$(SCRIPT_DIR)/yesNoQuestion "This cleans RYT installation $(RYT_DIR): are you sure to continue?"
	rm -fR $(RYT_DIR)
	@echo "==> $@ succeeded."
cleanData:
	@$(SCRIPT_DIR)/yesNoQuestion "About to clean RYT data $(RYT_DATA_DIR): are you sure to continue?"
	! $(SCRIPT_DIR)/yesNoQuestion "OK, but this really would clean RYT data $(RYT_DATA_DIR); asking the opposite (to avoid mistakes):\n  Do you want to keep RYT data?"
	sudo rm -fR $(RYT_DATA_DIR) $(RYT_DIR)/dataDirs_inited.flag
	@echo "==> $@ succeeded."


# server init
#
checkServer: $(WWW_SERVER_DIR)/$(RYT_DIRNAME)
	curl --fail $(WWW_SERVER_URL)
RYT_URL := $(WWW_SERVER_URL)/$(WWW_RYT_PATH)
RYT_ADMIN_URL := $(RYT_URL)/Admin
RYT_ADMIN_DIR := $(RYT_DIR)/Admin
checkRYTAtServer: checkServer
	curl --fail "$(RYT_ADMIN_URL)/index.html"
checkPHP5: checkRYTAtServer
	curl --fail "$(RYT_ADMIN_URL)/m_pong.php5" | grep pong

$(RYT_DIR)/dataDirs_inited.flag: | $(RYT_ADMIN_DIR) $(RYT_DATA_DIR)
	$(MAKE) -f $(THIS_FILE) checkPHP5
	curl "$(RYT_ADMIN_URL)/m_createDirPaths.php5?depth=$(RYT_DATA_DIR_NESTING)&makeMissingDirs=true" | grep "Success!" || ( echo -e "Initing data dirs failed: correct RYT_ADMIN_URL '$(RYT_ADMIN_URL)'?\nMoreover WWW server needs write access in RYT_DATA_DIR '$(RYT_DATA_DIR)' for PHP5 scripts." && false )
	touch $@
	@echo "==> data dirs inited."
initDataDirsIfMissing: $(RYT_DIR)/dataDirs_inited.flag
	@echo "==> $@ succeeded."

init: $(THIS_FILE) checkServer enableMaintenance initDataDirsIfMissing initPublicProjects
	$(MAKE) disableMaintenance # only needed for init
	@echo "==> $@ succeeded."

initPublicProjects:
	sudo $(SCRIPT_DIR)/updateProjects_from_to PublicProjects $(RYT_DATA_DIR) forceFlag
	sudo chown $(WWW_USER_ID) $(RYT_DATA_DIR)/*.json
updatePublicProjects:
	sudo $(SCRIPT_DIR)/updateProjects_from_to PublicProjects $(RYT_DATA_DIR)
	sudo chown $(WWW_USER_ID) $(RYT_DATA_DIR)/*.json


# server control
#

enableMaintenance:
	touch $(MAINTENANCE_ALLOWED_FLAG_FILE)
	@echo "==> $@ succeeded."
disableMaintenance:
	rm -f $(MAINTENANCE_ALLOWED_FLAG_FILE)
	@echo "==> $@ succeeded."


#
# webside
#

SCREENSHOT_DST_DIR := $(WWW_DST_DIR)/Screenshots

SCREENSHOT_SRC_DIR := $(WWW_SRC_DIR)/Screenshots
SS_TITLES_SRC := $(wildcard $(SCREENSHOT_SRC_DIR)/*.txt)
SCREENSHOTS_SRC := $(wildcard $(SCREENSHOT_SRC_DIR)/*.png)
SCREENSHOTS_DST := $(patsubst $(SCREENSHOT_SRC_DIR)/%,$(SCREENSHOT_DST_DIR)/%,$(SCREENSHOTS_SRC))
SCREENSHOTTHUMBNAILS_SRC := $(addsuffix .thumbnail.png, $(basename $(SCREENSHOTS_SRC)))
SCREENSHOTTHUMBNAILS_DST := $(patsubst $(SCREENSHOT_SRC_DIR)/%,$(SCREENSHOT_DST_DIR)/%,$(SCREENSHOTTHUMBNAILS_SRC))
WWW_SRC := $(wildcard $(WWW_SRC_DIR)/*.js $(WWW_SRC_DIR)/*.png) $(WWW_SRC_DIR)/Colorbox/jquery.colorbox.js
WWW_DST := $(patsubst $(WWW_SRC_DIR)/%,$(WWW_DST_DIR)/%,$(WWW_SRC))


# WWW
$(SCREENSHOT_DST_DIR) $(COLORBOX_DIR):
	mkdir -p $@
$(WWW_DST_DIR)/index.html: $(WWW_SRC_DIR)/index.html.tp $(SS_TITLES_SRC) $(SCREENSHOTS_SRC)
	echo $< $@
	$(SCRIPT_DIR)/fillInScreenshots $< $@
$(WWW_DST_DIR)/indexDevel.html: $(WWW_SRC_DIR)/indexDevel.html.tp $(SS_TITLES_SRC) $(SCREENSHOTS_SRC) $(SCREENSHOT_DST_DIR)
	$(SCRIPT_DIR)/fillInScreenshots $< $@
$(SCREENSHOT_DST_DIR)/%: $(SCREENSHOT_SRC_DIR)/%
#	echo "hier 2: $< $@"
	cp $< $@
%.thumbnail.png: %.png
	convert -scale 12.5% $< $@
COLORBOX_DIR := $(WWW_DST_DIR)/Colorbox
$(WWW_DST_DIR)/%: $(WWW_SRC_DIR)/%
	cp $< $@
# target used as sentinel triggering recursive copy
$(WWW_DST_DIR)/Colorbox/jquery.colorbox.js: $(WWW_SRC_DIR)/Colorbox/jquery.colorbox.js $(WWW_DST_DIR)
	cp -R $(WWW_SRC_DIR)/Colorbox $(WWW_DST_DIR) # copy bunch of files

# only one webside at website, but its more than just one file
webside: $(THIS_FILE) \
         $(WWW_DST_DIR) \
         $(WWW_DST_DIR)/index.html \
         $(SCREENSHOT_DST_DIR) $(SCREENSHOTS_DST) $(SCREENSHOTTHUMBNAILS_DST) \
         $(WWW_DST)


#
# lftp targets

$(SCRIPT_DIR)/%.lftp: $(SCRIPT_DIR)/%.lftp.in
	$(SCRIPT_DIR)/fillIn_lftpInfo \
          $< $(INSTALL_DIR) $(RYT_DIRNAME) $(EXTERNAL_SERVER) $(RYT_DATA_DIRNAME) $(TMP_DIR) \
          > $@
lftp: $(TARGETS_LFTP) $(TMP_DIR)

#
# admin scripts

# more specific %.lftp rule above (seq counts)
$(SCRIPT_DIR)/%: $(SCRIPT_DIR)/%.in
	$(call getPWOnce)
	$(SCRIPT_DIR)/fillIn_adminURL_adminPW_dirDepth \
          $< $(RYT_ADMIN_URL) $(PASSWORD) $(RYT_DATA_DIR_NESTING) > $@
	@chmod u+x $@

EXTERNAL_SERVER_URL    := http://$(EXTERNAL_SERVER)
EXTERNAL_RYT_PATH      := $(RYT_DIRNAME)
RYT_EXTERNAL_URL       := $(EXTERNAL_SERVER_URL)/$(EXTERNAL_RYT_PATH)
RYT_EXTERNAL_ADMIN_URL := $(RYT_EXTERNAL_URL)/Admin
$(SCRIPT_DIR)/external_%: $(SCRIPT_DIR)/%.in
	$(call getPWOnce)
	$(SCRIPT_DIR)/fillIn_adminURL_adminPW_dirDepth \
          $< $(RYT_EXTERNAL_ADMIN_URL) $(PASSWORD) $(RYT_DATA_DIR_NESTING) > $@
	@chmod u+x $@


# helpers
#

success: ; @echo -e ">>\n>> [$(THIS_FILE)] Success!\n>>"

# info
#
MAIN_HTML_URL              :=$(RYT_URL)/$(MAIN_HTML_NAME)
MAIN_UNMINIFIED_HTML_URL   :=$(RYT_URL)/$(MAIN_UNMINIFIED_HTML_NAME)
DEVEL_HTML_URL             :=$(RYT_URL)/$(DEVEL_HTML_NAME)
VERSION_HTML_URL           :=$(RYT_URL)/$(VERSION_HTML_NAME)
VERSION_UNMINIFIED_HTML_URL:=$(RYT_URL)/$(VERSION_UNMINIFIED_HTML_NAME)
info:
	@echo ">>"
	@echo ">> [$@].."
	@echo ">>"
	@echo ">>   [config.src].."
	@echo ">>"
	@echo ">>     INSTALL_DIR   : $(INSTALL_DIR)"
	@echo ">>     WWW_USER_ID   : $(WWW_USER_ID)"
	@echo ">>     WWW_SERVER_DIR: $(WWW_SERVER_DIR)"
	@echo ">>     WWW_SERVER_URL: $(WWW_SERVER_URL)"
	@echo ">>     WWW_RYT_PATH  : $(WWW_RYT_PATH)"
	@echo ">>"
	@echo ">>   ..[config.src]"
	@echo ">>"
	@echo ">>   [computed].."
# URLs
	@echo ">>"
	@echo ">>     CURRENT_VERSION            : $(CURRENT_VERSION)"
	@echo ">>"
	@echo ">>     MAIN_HTML_URL              : $(MAIN_HTML_URL)"
	@echo ">>     MAIN_UNMINIFIED_HTML_URL   : $(MAIN_UNMINIFIED_HTML_URL)"
	@echo ">>"
	@echo ">>     RYT_URL                    : $(RYT_URL)"
	@echo ">>     DEVEL_HTML_URL             : $(DEVEL_HTML_URL)"
	@echo ">>     VERSION_HTML_URL           : $(VERSION_HTML_URL)"
	@echo ">>     VERSION_UNMINIFIED_HTML_URL: $(VERSION_UNMINIFIED_HTML_URL)"

	@echo ">>"
	@echo ">>     WWW_SERVER_DIR/RYT_DIRNAME: $(WWW_SERVER_DIR)/$(RYT_DIRNAME) (link to RYT install)"
	@echo ">>"
	@echo ">>     THIS_DIR       : $(THIS_DIR)"
	@echo ">>     THIS_FILE      : $(THIS_FILE)"
	@echo ">>     RYT_DIR        : $(RYT_DIR)"
	@echo ">>     RYT_DATA_DIR   : $(RYT_DATA_DIR)"
	@echo ">>     RELEASE_DIR    : $(RELEASE_DIR)"
	@echo ">>     ADMIN_DIR      : $(ADMIN_DIR)"
	@echo ">>     DEVEL_DIR      : $(DEVEL_DIR)"
	@echo ">>     MAIN_HTML      : $(MAIN_HTML)"
	@echo ">>     DEVEL_HTML     : $(DEVEL_HTML)"
	@echo ">>     VERSION_HTML   : $(VERSION_HTML)"
	@echo ">>"
	@echo ">>   ..[computed]"
	@echo ">>"
	@echo ">> ..[$@]"
	@echo ">>"
devel_info: info
	@echo ">> [$@].."
	@echo ">> TO_BE_COPIED_PUBLIC: $(TO_BE_COPIED_PUBLIC)"
	@echo ">> TO_BE_COPIED_ADMIN: $(TO_BE_COPIED_ADMIN)"
	@echo ">> .VARIABLES: $(.VARIABLES)"
	@echo ">> ..[$@]"
FORCE:

# .PHONY: install checkServer init ...

usage: info
	@echo ">>"
	@echo ">> [$@].."
	@echo ">>   Please check [info] above: all variables should be set!"
	@echo ">>"
	@echo ">> Normal:"
	@echo ">>   make install -> first time install followed by init of data dirs."
	@echo ">>   make upgrade -> upgrade of existing install; should be called after repository update."
	@echo ">>"
	@echo ">> Changing admin password wherever being used:"
	@echo ">>   make clean upgrade -> globally changes admin password."
	@echo ">>"
	@echo ">> Clean:"
	@echo ">>   make clean        -> cleans targets:"
	@echo ">>     $(TARGETS_ALL)"
	@echo ">>   make cleanDevel   -> cleans devel links and $(DEVEL_HTML)."
	@echo ">>   make cleanInstall -> cleans RYT installation."
	@echo ">>   make cleanData    -> cleans RYT data: dangerous!"
	@echo ">>"
	@echo ">> Devel:"
	@echo ">>   make devel        -> for accessing devel version (where Git repo stays)"
	@echo ">>                        directly via $(DEVEL_HTML_URL)."
	@echo ">>"
	@echo ">> Debugging:"
	@echo ">>   make installWithoutInit -> first time install."
	@echo ">>   make init               -> inits data directories, needed *once* after"
	@echo ">>                              installWithoutInit ('make install' does both)."
	@echo ">> ..[$@]"
	@echo ">>"

test:
	@echo ">> [$@].."
	echo $(T_FIRST)
	echo $(T_SECOND)
	env
	@echo ">> ..[$@]"
ttt: $(THIS_FILE)
	echo "in ttt..........."
	touch ttt
	echo $(SOUNDS_SRC)
	echo $(SOUNDS_DST)
