**Source files for the Classic/HPC changelog.**

This readme describes:

* The [changelog philosophy](#philosophy)
* How to [build the documents](#how-to-build)
* The adopted [style guide and conventions](#style-guide-and-conventions)

## Philosophy

The philosophy behind this changelog is to advertise the cool new feature and enhancements that we all work hard to develop and test. With that in mind, the idea is to write a brief description on each new feature and/or enhancement and try and include a nice image or video for each one - think of it almost like a powerpoint slide on the feature. The description itself **does not** need to go into detail on how to implement this feature in TUFLOW. The implementation detail should be written in the TUFLOW Manual and the relevant section should be referred to and linked in the changelog.

## Getting Setup

Firstly, this does not use Bookdown or R, so be prepared for a slightly different process than what is used for the Manuals. It is a little similar as it does use markdown, and you can think of it as just a different set of libraries for converting markdown to html. 

In terms of an IDE, something like [Visual Studio Code](https://code.visualstudio.com/) is quite good as it (like many IDEs) has native git and markdown support as well as a terminal (powershell or cmd) which can be used to build the docs. It does nothing that is absolutely required for the process, so feel free to use your favourite IDE if you want. To use VS Code once installed, right click the project folder and select "Open with Code" to open the entire project rather just a single file.

### Clone Repository

Clone the repository with git:

1. Open a terminal session
2. Navigate to where the project folder will be saved
3. Clone the repo: `git clone git@bmt-gitlab.bmt-wbm.local:tuflow/manual/tuflow-classic-hpc-changelog.git`
4. Switch to the branch you want to work on: `git switch [version]`. The branch name is always named after the TUFLOW version e.g. for the 2025.1.2 changelog, this will be `git switch 2025.1.2`

### How to Build

Instead of R, this uses Ruby and Jekyll to build the docs. The below instructions have been taken from the following site and repeated here for convenience.
[https://jekyllrb.com/docs/installation/windows/](https://jekyllrb.com/docs/installation/windows/)

### Steps That are Required Each Time

If this is the first time you are building the documentation, please follow the [First Time Setup](#first-time-setup) instructions below first then come back to this.

Before building the documentation, ensure you have the latest changes from the repository. Open a terminal in the project root directory and run:

1. `git pull` - this will pull the latest changes from the remote repository.
2. `git switch [version]` - switch to the branch you want to work on, if not already on it. The branch name is always named after the TUFLOW version e.g. for the 2025.2.0 changelog, this will be `git switch 2025.2.0`.

Once you have the latest changes and are on the correct branch, you can build the documentation by running the `serve-internal.ps1` or `serve-external.ps1` script.

Within a terminal session, and within the project root directory, you can run either `.\serve.ps1` in powershell or `serve.bat` in command prompt to build and serve the documents. Once it is running, open a browser and navigate to `http://localhost:4000/classic-hpc/changelog/` to view the built documents.

If you make updates to any of the markdown documents, the page should automatically update when you save your changes and it is just a matter of refreshing the browser to see the updates. This is also true for some configuration changes, however when changing certain configuration settings it may be necessary to stop the service (`ctrl+c`) and rerun the `serve` script to get the changes.

### First Time Setup

The below instructions are only required the first time you set up the project on your machine.

#### Install Ruby For Windows and Jekyll

1. Download and install a **Ruby+Devkit** (x64) version from [RubyInstaller Downloads](https://rubyinstaller.org/downloads/). At the time of writing this README, the ruby version that was used was `3.3.5`. Use default options for installation.
2. Run the `ridk install` step on the last stage of the installation wizard. This is needed for installing gems with native extensions. You can find additional information regarding this in the [RubyInstaller Documentation](https://github.com/oneclick/rubyinstaller2#using-the-installer-on-a-target-system). From the options choose `MSYS2 and MINGW development toolchain` (by entering `3` and pressing `enter`). After it is done, it may go back to the initial question and say something like, "if unsure press enter". At this stage it is done and you can close the window.
3. Open a new command prompt window from the start menu, so that changes to the `PATH` environment variable becomes effective. Install Jekyll and Bundler using `gem install jekyll bundler`.
4. Check if Jekyll has been installed properly: `jekyll -v`. The Jekyll version at the time of writing this is `4.3.4`. If you want to install a specific version of `jekyll` and `bundler` then use the following commands:
    1. `gem uninstall jekyll bundler` (if you need/want to uninstall the current versions you have)
    2. `gem install jekyll -v 4.3.4`
    3. `gem install bundler -v 2.5.16`

#### Install just-the-docs

[Just-the-docs](https://just-the-docs.com/) is the template that is used. Before you build the documentation for the first time, you will need to run the following command in a terminal within the project root directory to install just-the-docs: `bundle install`.

#### Updating Library Versions

When library versions need to be updated, these will most likely be specified in the `gemfile`. To update your libraries, open a terminal in the root directory and re-run `bundle install`. This works for upgrading as well as downgrading library versions.

#### Removing Duplicate Libraries

It is recommended to check for, and remove any duplicate libraries. Run `gem list` to see all the libraries that are installed. If you see any duplicates, you can remove them by running `gem uninstall <library_name>`. If you are unsure which version to remove, you can remove all versions of the library by then running `bundle install` to re-install the correct versions (which are specified in the `gemfile`). See below if you run into any permission errors.

Note: one library this is important for is `sass-embedded` (check the gemfile for the correct version).

Note: if you've run the tool before you might need to delete the `jekyll-cache` folder.

### Troubleshooting

#### Permission Error

Sometimes Ruby will error saying it doesn't have file permissions. To get around this you can try the following:

1. Open a terminal session as admin
2. Try whatever the command is you were executing again
3. If you get an error like `gem is not a recognised command` then you have to add the Ruby `bin` directory to the path<br>
In command prompt:<br>
`path C:\Ruby33-x64\bin;%path%`<br>
In powershell:<br>
`$env:Path += ";C:\Ruby33-x64\bin"`

#### Formatting Looks Wrong

If the document builds but looks odd (the formatting is strange or some of the media isn't displaying properly), then it could be that Ruby is using the wrong library versions. For instance, if you upgraded a particular library the old library might still be being used. 

You can see the library versions using `gem list`. If you know the library that is using the incorrect version e.g. `sass-embedded` could be incorrect, you can use `gem uninstall sass-embedded` to uninstall a particular version (it will give you the option once the command has been executed to choose a version), or uninstall all versions of the particular library and re-run `bundle install`.

If you are unsure on what library is causing the issue, you can uninstall all gems and then re-install the correct versions:

1. Uninstall all gems:<br>
`gem uninstall -aIx`
2. Re-install correct library versions:<br>
`gem install jekyll -v 4.3.4`<br>
`gem install bundler -v 2.5.16`<br>
`bundle install` 
3. Check for duplicate library versions

## Publishing Externally

1. First, make sure you run the `serve-external.ps1` script and check that the built documents do not include the upcoming changelog pages.
2. Setup a `docs_copy.ps1` configuration file. For the changelog, the important parts are `"docs_source":  "./_site"` and `"docs_target":  "classic-hpc/changelog"`.
3. Run the `docs_copy.ps1` script to copy the built documents.

## Publishing Internally

1. Build the documents using the `serve-internal.ps1` script and check that the built documents include the upcoming changelog pages.
2. Copy the built documents to the internal server: <Br>`.\tuflowdocs-upload.ps1 .\_site\ classic-hpc/changelog`

## Style Guide and Conventions

### General Rules

* Past tense - descriptions should be written in past tense
* You don't need to start each feature description with the version name e.g. "Build 2024.0.0 does so and so..." as this is redundant since the entire page is already dedicated to this particular build.
* Links to the TUFLOW Manual should not use section numbers and should be referenced as simply "TUFLOW User Manual" with the entire name hyperlinked (the link itself should reference the correct section)<br>
e.g. "the feature is described further in the [TUFLOW User Manual](https://docs.tuflow.com/classic-hpc/manual/2023-03/Outputs-1.html#PlotOutput-4)..."
* Links to the TUFLOW Manual should point to a specific manual version e.g. changelog for the 2024.0.0 release should point to the 2024 TUFLOW Manual version
* Error messages should be linked to their relevant wiki page and the message text should not be included<br>
e.g. "[ERROR 0310](https://wiki.tuflow.com/TUFLOW_Message_0310) is now written out correctly..."
* TUFLOW commands should use the following syntax so it is styled correctly (identical to how it is done for the manual)<br>
`<tcmd>COMMAND TEXT</tcmd><teq> == </teq><tblk>VALUE TEXT</tblk>` or use the Jekyll filter described below.
* TUFLOW commands should be linked to the relevant command in the TUFLOW Manual Appendix
* New TUFLOW command should use a callout box (see [section below](#new-tuflow-commands))
* It is ok to use inline code formatting if it is appropriate e.g. when referring to a `QT` boundary type or `Should not be here`
* Please try your best to add an image or video for each new feature or enhancement
* Citations/Referencing - at the moment there is no support for this so please don't make any citations. Reserve this sort of documentation for the manual.
* Do not use phrases such as "coming soon" on "in an upcoming release".
* Generally equations don't need to go in the changelog and can be put in the manual but if you really want to use an equation, this has not been setup yet, so please chat to Ellis

### New TUFLOW Commands

New TUFLOW commands should use callout boxes. An example with full formatting and linking:

```
{: .tcf-command}
> [<tcmd>Defaults</tcmd>\<teq> == </teq><tblk>PRE 2024</tblk>](https://docs.tuflow.com/classic-hpc/manual/2023-03/TCFCommands-1.html#tcfDefaults)
```

The relevant control file should be used ("tcf-command" can be changed to "tgc-command" for TGC commands).

### Jekyll Filter for Formatting
Claude (AI) created a Jekyll filter that we can use for formatting. For example, you can use the code below to do style the command within a call out box and the filter will do the \<tcmd\>, \<teq\>, \<tblk\> commands:

```
{: .tcf-command}
> [{{"TIN Triangulation Approach == Method B" | style_command}}](https://docs.tuflow.com/classic-hpc/manual/2024/TCFCommands-1.html#tcfTINTriangulationApproach)
```

It can even format multiple lines including comments and If statements but the convention is slightly different. It captures the text into a variable

```
{% capture command_text %}
! Testing formatting
If Scenario == ScenarioA
   TIN Triangulation Approach == Method B
   Start Date == 01/01/2024
   End Date == 02/01/2024
End If
{% endcapture %}
{{ command_text | prepare_text | style_command }}
```

### Labels

Label(s) can be added next to a new feature or enhancement section titles. The available labels are:

* Major New Feature
* Beta Functionality

Multiple labels can be applied to any given heading.

The method of adding is as follows:

```
### TUFLOW CATCH
{: .d-inline-block}

Major Feature
{: .label .label-major-feature}
```

The initial `{: .d-inline-block}` sets the label to be inline with the heading.

### Changes to Defaults

Any changes to defaults should be added to the TUFLOW Manual and not the changelog.

### Images and Videos

Any images and videos should be added to the `assets/<version>` folder. Examples of how to reference them is demonstrated below:

**Image:**

```
![]({{ site.baseurl }}/assets/2024-0-0/tin_example.png)
```

**Video:**

```
<video style="max-width:640px" controls>
  <source src="{{ site.baseurl }}/assets/2024-0-0/estry_ad_wq.mp4" type="video/mp4">
</video>
```
